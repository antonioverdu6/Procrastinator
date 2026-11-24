from datetime import datetime, timedelta
from typing import Dict, Any, List
from .database import get_connection

def get_today_date_str() -> str:
    return datetime.now().strftime('%Y-%m-%d')

def get_settings() -> Dict[str, Any]:
    conn = get_connection()
    row = conn.cursor().execute('SELECT * FROM settings WHERE id = 1').fetchone()
    conn.close()
    if not row:
        return {'defaultDailyHours': 2.5, 'aiProvider': 'gemini', 'apiKey': '', 'strictness': 'balanced', 'language': 'es'}
    return dict(row)

def get_effective_capacity(date_str: str) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM daily_plans WHERE date = ?', (date_str,))
    plan_row = cursor.fetchone()

    settings = get_settings()
    base_minutes = int(round(settings['defaultDailyHours'] * 60))

    if not plan_row:
        cursor.execute(
            'INSERT INTO daily_plans (date, baseCapacityMinutes, extraMinutesAdjustment, completed) VALUES (?, ?, 0, 0)',
            (date_str, base_minutes)
        )
        conn.commit()
        plan_dict = {
            'date': date_str,
            'baseCapacityMinutes': base_minutes,
            'extraMinutesAdjustment': 0,
            'completed': 0
        }
    else:
        plan_dict = dict(plan_row)

    conn.close()

    total_capacity = max(30, plan_dict['baseCapacityMinutes'] + plan_dict['extraMinutesAdjustment'])
    return {
        'date': date_str,
        'baseCapacityMinutes': plan_dict['baseCapacityMinutes'],
        'extraMinutesAdjustment': plan_dict['extraMinutesAdjustment'],
        'totalCapacityMinutes': total_capacity,
        'completed': bool(plan_dict['completed'])
    }

def adjust_today_capacity(delta_minutes: int, is_absolute: bool = False) -> Dict[str, Any]:
    today = get_today_date_str()
    plan_info = get_effective_capacity(today)
    conn = get_connection()
    cursor = conn.cursor()

    if is_absolute:
        new_adjustment = delta_minutes - plan_info['baseCapacityMinutes']
    else:
        new_adjustment = plan_info['extraMinutesAdjustment'] + delta_minutes

    cursor.execute(
        'UPDATE daily_plans SET extraMinutesAdjustment = ? WHERE date = ?',
        (new_adjustment, today)
    )
    conn.commit()

    new_total = max(30, plan_info['baseCapacityMinutes'] + new_adjustment)

    # Evaluar tareas programadas para hoy
    cursor.execute('SELECT * FROM tasks WHERE scheduledDate = ? AND status != "deferred"', (today,))
    today_tasks = [dict(r) for r in cursor.fetchall()]
    current_minutes = sum(t['estimatedMinutes'] for t in today_tasks)

    tasks_added = []
    tasks_deferred = []

    priority_weights = {'urgent': 4, 'high': 3, 'medium': 2, 'low': 1}

    if current_minutes < new_total:
        # Añadir tareas del backlog
        available = new_total - current_minutes
        cursor.execute('SELECT * FROM tasks WHERE status = "backlog"')
        backlog = [dict(r) for r in cursor.fetchall()]
        backlog.sort(key=lambda t: priority_weights.get(t['priority'], 1), reverse=True)

        for t in backlog:
            if t['estimatedMinutes'] <= available + 15:
                cursor.execute(
                    'UPDATE tasks SET status = "scheduled_today", scheduledDate = ? WHERE id = ?',
                    (today, t['id'])
                )
                available -= t['estimatedMinutes']
                tasks_added.append(t)
                if available <= 0:
                    break

    elif current_minutes > new_total:
        # Mover tareas no iniciadas al backlog para no agobiar
        excess = current_minutes - new_total
        candidates = [t for t in today_tasks if t['status'] == 'scheduled_today']
        candidates.sort(key=lambda t: priority_weights.get(t['priority'], 1))

        for t in candidates:
            cursor.execute(
                'UPDATE tasks SET status = "backlog", scheduledDate = NULL, deferredCount = deferredCount + 1 WHERE id = ?',
                (t['id'],)
            )
            excess -= t['estimatedMinutes']
            tasks_deferred.append(t)
            if excess <= 0:
                break

    conn.commit()
    conn.close()

    return {
        'newTotalCapacity': new_total,
        'tasksAdded': tasks_added,
        'tasksDeferred': tasks_deferred
    }

def calculate_stats() -> Dict[str, Any]:
    today = get_today_date_str()
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM tasks')
    all_tasks = [dict(r) for r in cursor.fetchall()]

    cursor.execute('SELECT * FROM projects')
    all_projects = [dict(r) for r in cursor.fetchall()]

    cursor.execute('SELECT * FROM work_sessions')
    all_sessions = [dict(r) for r in cursor.fetchall()]

    settings = get_settings()
    capacity_info = get_effective_capacity(today)

    today_tasks = [t for t in all_tasks if t['scheduledDate'] == today]
    today_completed = [t for t in today_tasks if t['status'] == 'completed']

    today_planned_minutes = capacity_info['totalCapacityMinutes']
    today_worked_minutes = sum(t['actualMinutes'] for t in today_tasks)
    today_completed_minutes = sum(t['actualMinutes'] or t['estimatedMinutes'] for t in today_completed)

    today_completion_rate = 0
    if today_planned_minutes > 0:
        today_completion_rate = min(100, int(round((today_completed_minutes / today_planned_minutes) * 100)))

    # Procrastination score
    total_deferred = sum(t['deferredCount'] for t in all_tasks)
    total_finished = len([t for t in all_tasks if t['status'] == 'completed'])
    procrastination_score = max(10, min(100, 100 - (total_deferred * 8) + (total_finished * 2)))

    # Ratio de precisión
    tested_tasks = [t for t in all_tasks if t['actualMinutes'] > 0]
    total_est = sum(t['estimatedMinutes'] for t in tested_tasks)
    total_act = sum(t['actualMinutes'] for t in tested_tasks)
    accuracy_ratio = round(total_act / total_est, 2) if total_est > 0 else 1.0

    # Racha
    completed_dates = set()
    for t in all_tasks:
        if t['completedAt']:
            completed_dates.add(t['completedAt'].split('T')[0])
    for s in all_sessions:
        completed_dates.add(s['date'])

    streak_days = 0
    check_date = datetime.now()
    if today in completed_dates:
        streak_days += 1
    for i in range(1, 31):
        prev_d = (check_date - timedelta(days=i)).strftime('%Y-%m-%d')
        if prev_d in completed_dates:
            streak_days += 1
        else:
            break

    # Actividad de últimos 7 días
    day_names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    weekly_activity = []
    for i in range(6, -1, -1):
        d = datetime.now() - timedelta(days=i)
        d_str = d.strftime('%Y-%m-%d')
        weekday_idx = int(d.strftime('%w'))
        d_name = day_names[weekday_idx]

        day_tasks = [t for t in all_tasks if (t['completedAt'] and t['completedAt'].startswith(d_str)) or (t['scheduledDate'] == d_str)]
        planned_m = today_planned_minutes if d_str == today else int(round(settings['defaultDailyHours'] * 60))
        actual_m = sum(t['actualMinutes'] for t in day_tasks)
        pct = min(150, int(round((actual_m / planned_m * 100)))) if planned_m > 0 else (100 if actual_m > 0 else 0)

        weekly_activity.append({
            'date': d_str,
            'dayName': d_name,
            'plannedHours': round(planned_m / 60, 1),
            'actualHours': round(actual_m / 60, 1),
            'completionPercent': pct,
            'tasksCount': len(day_tasks)
        })

    # Distribución por prioridad
    priority_distribution = [
        {'priority': 'urgent', 'label': 'Urgente', 'count': len([t for t in all_tasks if t['priority'] == 'urgent']), 'color': '#DC2626'},
        {'priority': 'high', 'label': 'Alta', 'count': len([t for t in all_tasks if t['priority'] == 'high']), 'color': '#D97706'},
        {'priority': 'medium', 'label': 'Media', 'count': len([t for t in all_tasks if t['priority'] == 'medium']), 'color': '#2563EB'},
        {'priority': 'low', 'label': 'Baja', 'count': len([t for t in all_tasks if t['priority'] == 'low']), 'color': '#64748B'},
    ]

    # Distribución por dificultad
    difficulty_distribution = [
        {'difficulty': 'easy', 'label': 'Fácil', 'count': len([t for t in all_tasks if t['difficulty'] == 'easy']), 'color': '#16A34A'},
        {'difficulty': 'medium', 'label': 'Media', 'count': len([t for t in all_tasks if t['difficulty'] == 'medium']), 'color': '#2563EB'},
        {'difficulty': 'hard', 'label': 'Compleja', 'count': len([t for t in all_tasks if t['difficulty'] == 'hard']), 'color': '#9333EA'},
    ]

    # Progreso de proyectos
    project_progress = []
    for proj in all_projects:
        p_tasks = [t for t in all_tasks if t['projectId'] == proj['id']]
        p_done = [t for t in p_tasks if t['status'] == 'completed']
        done_mins = sum(t['actualMinutes'] or t['estimatedMinutes'] for t in p_done)
        total_mins = sum(t['estimatedMinutes'] for t in p_tasks) or int(proj['targetHours'] * 60)

        done_hrs = round(done_mins / 60, 1)
        tot_hrs = round(total_mins / 60, 1)
        pct = min(100, int(round((done_hrs / tot_hrs) * 100))) if tot_hrs > 0 else 0

        project_progress.append({
            'id': proj['id'],
            'name': proj['name'],
            'color': proj['color'],
            'completedHours': done_hrs,
            'totalHours': tot_hrs,
            'percentage': pct
        })

    conn.close()

    total_hours_completed = round(sum(t['actualMinutes'] or t['estimatedMinutes'] for t in all_tasks if t['status'] == 'completed') / 60, 1)
    weekly_hours_completed = round(sum(w['actualHours'] for w in weekly_activity), 1)

    return {
        'streakDays': max(streak_days, 1),
        'totalHoursCompleted': total_hours_completed,
        'weeklyHoursCompleted': weekly_hours_completed,
        'todayPlannedMinutes': today_planned_minutes,
        'todayWorkedMinutes': today_worked_minutes,
        'todayCompletionRate': today_completion_rate,
        'procrastinationScore': procrastination_score,
        'totalTasksFinished': total_finished,
        'accuracyRatio': accuracy_ratio,
        'weeklyActivity': weekly_activity,
        'projectProgress': project_progress,
        'priorityDistribution': priority_distribution,
        'difficultyDistribution': difficulty_distribution
    }
