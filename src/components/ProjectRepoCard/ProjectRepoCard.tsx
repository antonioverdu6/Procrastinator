import React, { useState, useEffect } from 'react';
import { GitBranch, Link2 } from 'lucide-react';
import { Project, RepoPreview } from '../../types';
import { api } from '../../services/api';
import { ProcrastinatorBox } from '../ProcrastinatorBox';
import { ProcrastinatorButton } from '../ProcrastinatorButton';
import { ProcrastinatorBadge } from '../ProcrastinatorBadge';
import { ProcrastinatorInput } from '../ProcrastinatorInput';
import { ProcrastinatorText } from '../ProcrastinatorText';
import { useI18n } from '../../i18n';

interface ProjectRepoCardProps {
  project: Project;
  onUpdated: () => void;
}

export const ProjectRepoCard: React.FC<ProjectRepoCardProps> = ({ project, onUpdated }) => {
  const { t } = useI18n();
  const [repoDraft, setRepoDraft] = useState(project.repoUrl || '');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState<RepoPreview | null>(null);

  useEffect(() => {
    setRepoDraft(project.repoUrl || '');
    setPreview(null);
  }, [project.id, project.repoUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setPreview(null);
    try {
      await api.updateProject(project.id, { repoUrl: repoDraft.trim() });
      onUpdated();
      if (repoDraft.trim()) {
        setChecking(true);
        const res = await api.getProjectRepoPreview(project.id);
        setPreview(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
      setChecking(false);
    }
  };

  const handleCheck = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const res = await api.getProjectRepoPreview(project.id);
      setPreview(res);
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <ProcrastinatorBox variant="card" className="p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-[#2563EB]" />
          <ProcrastinatorText variant="h3">
            {t.projects.repoCardTitle} {project.name}
          </ProcrastinatorText>
        </div>
        <ProcrastinatorText variant="caption">{t.projects.repoCardSubtitle}</ProcrastinatorText>
      </div>

      <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-2">
        <ProcrastinatorInput
          type="text"
          placeholder={t.projects.repoInputPlaceholder}
          value={repoDraft}
          onChange={e => setRepoDraft(e.target.value)}
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          <ProcrastinatorButton type="submit" variant="primary" disabled={saving}>
            <Link2 className="w-3.5 h-3.5" />
            <span>{saving ? t.projects.savingRepo : t.projects.saveRepo}</span>
          </ProcrastinatorButton>
          {project.repoUrl && (
            <ProcrastinatorButton type="button" variant="secondary" onClick={handleCheck} disabled={checking}>
              <span>{checking ? t.projects.readingRepo : t.projects.checkRepo}</span>
            </ProcrastinatorButton>
          )}
        </div>
      </form>

      {preview && (
        <ProcrastinatorBox variant="subtle" className="text-xs space-y-1.5">
          {preview.connected ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <ProcrastinatorBadge variant="success">
                  {t.projects.connectedBadge} {preview.repoLabel}
                </ProcrastinatorBadge>
                {preview.defaultBranch && (
                  <span className="text-[#475569]">
                    {t.projects.branchLabel} <strong>{preview.defaultBranch}</strong>
                  </span>
                )}
                {preview.language && (
                  <span className="text-[#475569]">
                    {t.projects.languageLabel} <strong>{preview.language}</strong>
                  </span>
                )}
                <span className="text-[#475569]">
                  <strong>{preview.filesCount}</strong> {t.projects.indexedFiles}
                </span>
              </div>
              {preview.sampleFiles.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {preview.sampleFiles.slice(0, 8).map(f => (
                    <span
                      key={f}
                      className="px-1.5 py-0.5 bg-white border border-[#E2E8F0] rounded font-mono text-[10px] text-[#334155]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-[#DC2626]">{preview.error || t.projects.repoErrorFallback}</div>
          )}
        </ProcrastinatorBox>
      )}
    </ProcrastinatorBox>
  );
};
