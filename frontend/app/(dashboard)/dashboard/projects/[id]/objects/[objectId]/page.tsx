'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import TasksPanel from '@/components/dashboard/TasksPanel';

interface ObjectSite {
  id: number; name: string; code?: string; siteType?: string; address?: string;
  description?: string; status?: number; foremanId?: number;
  startDate?: string; plannedEndDate?: string; actualEndDate?: string;
  areaSize?: number; projectId?: number; createdAt?: string; photos?: string[];
}
interface Project { id: number; name: string; code?: string; }
interface Doc { id: number; title: string; documentType?: string; status?: string; fileUrl?: string; createdAt?: string; }

interface BuildingObject {
  id: number; name: string; objectType?: string; classification?: string;
  description?: string; address?: string; floorNumber?: number; status?: string;
  parameters?: Record<string, any>;
  parent?: { id: number; name: string; objectType?: string } | null;
  children?: { id: number; name: string; objectType?: string; classification?: string; status?: string; parameters?: Record<string, any> }[];
  facilities?: { id: number; name: string; facilityType?: string; status?: string; location?: string }[];
}

interface FacilityComponent {
  id: number; componentType?: string; position: number; name: string;
  description?: string; configuration?: Record<string, any>; status?: string;
}
interface Facility {
  id: number; objectId: number; facilityType?: string; name: string;
  description?: string; location?: string; status?: string;
  configuration?: Record<string, any>;
  components?: FacilityComponent[];
}

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Планирование', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  1: { label: 'В работе', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  2: { label: 'Приостановлен', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  3: { label: 'Завершён', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
};

const OBJ_STATUS_COLOR: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  in_construction: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  archived: 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};
const OBJ_STATUS_LABEL: Record<string, string> = {
  planned: 'Запланировано', in_construction: 'В работе', completed: 'Завершено', archived: 'Архив',
};

const FAC_STATUS_COLOR: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  installed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  configured: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  operational: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  decommissioned: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
};
const FAC_STATUS_LABEL: Record<string, string> = {
  planned: 'Запланировано', installed: 'Установлено', configured: 'Настроено',
  operational: 'Работает', maintenance: 'Обслуживание', decommissioned: 'Выведено',
};

const FAC_TYPE_LABEL: Record<string, string> = {
  electrical_panel: 'Электрощит', collector_unit: 'Коллектор', ventilation: 'Вентиляция',
  plumbing_unit: 'Сантехнический узел', heating_unit: 'Отопительный узел', custom: 'Другое',
};

const OBJ_TYPE_LABEL: Record<string, string> = {
  building: 'Здание', apartment: 'Квартира', room: 'Помещение', floor: 'Этаж',
  section: 'Секция', facility: 'Сооружение', custom: 'Другое',
};

type TabKey = 'overview' | 'objects' | 'facilities' | 'tasks' | 'documents' | 'media';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Обзор' },
  { key: 'objects', label: 'Структура' },
  { key: 'facilities', label: 'Сооружения' },
  { key: 'tasks', label: 'Задачи' },
  { key: 'documents', label: 'Документы' },
  { key: 'media', label: 'Медиа' },
];

function isImageUrl(url: string) { return /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(url); }

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>;
}

export default function ObjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const projectId = Number(params.id);
  const objectId = Number(params.objectId);

  const [project, setProject] = useState<Project | null>(null);
  const [obj, setObj] = useState<ObjectSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  /* ── Documents ── */
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docSaving, setDocSaving] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  /* ── Media ── */
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  /* ── Overview edit ── */
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editStatus, setEditStatus] = useState(0);
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editPlannedEnd, setEditPlannedEnd] = useState('');
  const [saving, setSaving] = useState(false);

  /* ── Building objects (hierarchy) ── */
  const [buildingObjs, setBuildingObjs] = useState<BuildingObject[]>([]);
  const [objsLoading, setObjsLoading] = useState(false);
  const [objsLoaded, setObjsLoaded] = useState(false);
  const [showObjForm, setShowObjForm] = useState(false);
  const [editingBObj, setEditingBObj] = useState<BuildingObject | null>(null);
  const [bobjSaving, setBobjSaving] = useState(false);
  const [bobjName, setBobjName] = useState('');
  const [bobjType, setBobjType] = useState('room');
  const [bobjClass, setBobjClass] = useState('');
  const [bobjParent, setBobjParent] = useState('');
  const [bobjFloor, setBobjFloor] = useState('');
  const [bobjDesc, setBobjDesc] = useState('');
  const [bobjArea, setBobjArea] = useState('');
  const [bobjCeil, setBobjCeil] = useState('');
  const [expandedBObj, setExpandedBObj] = useState<number | null>(null);

  /* ── Facilities ── */
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facLoading, setFacLoading] = useState(false);
  const [facLoaded, setFacLoaded] = useState(false);
  const [showFacForm, setShowFacForm] = useState(false);
  const [editingFac, setEditingFac] = useState<Facility | null>(null);
  const [facSaving, setFacSaving] = useState(false);
  const [facName, setFacName] = useState('');
  const [facType, setFacType] = useState('electrical_panel');
  const [facLocation, setFacLocation] = useState('');
  const [facDesc, setFacDesc] = useState('');
  const [facObjectId, setFacObjectId] = useState('');
  const [expandedFac, setExpandedFac] = useState<number | null>(null);
  /* component form */
  const [showCompForm, setShowCompForm] = useState<number | null>(null);
  const [compName, setCompName] = useState('');
  const [compType, setCompType] = useState('module');
  const [compPos, setCompPos] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compSaving, setCompSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, siteRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/construction-sites/${objectId}`),
      ]);
      setProject(projRes.data);
      const site = siteRes.data;
      setObj(site);
      setEditName(site.name ?? '');
      setEditAddress(site.address ?? '');
      setEditCode(site.code ?? '');
      setEditStatus(typeof site.status === 'number' ? site.status : parseInt(site.status) || 0);
      setEditDescription(site.description ?? '');
      setEditStartDate(site.startDate?.slice(0, 10) ?? '');
      setEditPlannedEnd(site.plannedEndDate?.slice(0, 10) ?? '');
    } catch {
      addToast('error', 'Не удалось загрузить объект');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [projectId, objectId, addToast, router]);

  useEffect(() => { load(); }, [load]);

  const loadBuildingObjs = useCallback(async () => {
    if (objsLoading) return;
    setObjsLoading(true);
    try {
      const r = await api.get('/objects', { params: { constructionSiteId: objectId, limit: 200 } });
      const arr = r.data?.data || r.data || [];
      setBuildingObjs(Array.isArray(arr) ? arr : []);
      setObjsLoaded(true);
    } catch { setBuildingObjs([]); }
    finally { setObjsLoading(false); }
  }, [objectId, objsLoading]);

  const loadFacilitiesForAll = useCallback(async (objs: BuildingObject[]) => {
    if (!objs.length) { setFacilities([]); setFacLoaded(true); return; }
    setFacLoading(true);
    try {
      const allFacs: Facility[] = [];
      await Promise.all(objs.map(async (o) => {
        const r = await api.get(`/facilities/by-object/${o.id}`).catch(() => ({ data: [] }));
        const arr = Array.isArray(r.data) ? r.data : [];
        allFacs.push(...arr);
      }));
      setFacilities(allFacs);
      setFacLoaded(true);
    } catch { setFacilities([]); }
    finally { setFacLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'objects' && !objsLoaded && !objsLoading) loadBuildingObjs();
  }, [activeTab, objsLoaded, objsLoading, loadBuildingObjs]);

  useEffect(() => {
    if (activeTab === 'facilities') {
      if (!objsLoaded) {
        loadBuildingObjs().then(() => {});
      } else if (!facLoaded && !facLoading) {
        loadFacilitiesForAll(buildingObjs);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, objsLoaded, facLoaded, facLoading]);

  useEffect(() => {
    if (activeTab === 'facilities' && objsLoaded && !facLoaded && !facLoading) {
      loadFacilitiesForAll(buildingObjs);
    }
  }, [activeTab, objsLoaded, buildingObjs, facLoaded, facLoading, loadFacilitiesForAll]);

  useEffect(() => {
    if (activeTab === 'documents' && !docsLoaded && !docsLoading) {
      setDocsLoading(true);
      api.get('/documents', { params: { constructionSiteId: objectId, limit: 200 } })
        .then((r) => {
          const arr = r.data?.data || r.data?.documents || r.data || [];
          setDocs(Array.isArray(arr) ? arr : []);
          setDocsLoaded(true);
        })
        .catch(() => setDocs([]))
        .finally(() => setDocsLoading(false));
    }
  }, [activeTab, docsLoaded, docsLoading, objectId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/construction-sites/${objectId}`, {
        name: editName, address: editAddress, code: editCode || undefined,
        status: editStatus, description: editDescription || undefined,
        startDate: editStartDate || undefined, plannedEndDate: editPlannedEnd || undefined,
      });
      setObj(res.data ?? { ...obj, name: editName, address: editAddress });
      setEditing(false);
      addToast('success', 'Объект обновлён');
    } catch { addToast('error', 'Ошибка при сохранении'); }
    finally { setSaving(false); }
  };

  /* ── Building objects CRUD ── */
  const resetBobjForm = () => { setBobjName(''); setBobjType('room'); setBobjClass(''); setBobjParent(''); setBobjFloor(''); setBobjDesc(''); setBobjArea(''); setBobjCeil(''); };

  const openBobjCreate = () => { resetBobjForm(); setEditingBObj(null); setShowObjForm(true); };
  const openBobjEdit = (o: BuildingObject) => {
    setBobjName(o.name); setBobjType(o.objectType || 'room'); setBobjClass(o.classification || '');
    setBobjParent(o.parent?.id ? String(o.parent.id) : ''); setBobjFloor(o.floorNumber != null ? String(o.floorNumber) : '');
    setBobjDesc(o.description || ''); setBobjArea(o.parameters?.area ? String(o.parameters.area) : '');
    setBobjCeil(o.parameters?.ceiling_height ? String(o.parameters.ceiling_height) : '');
    setEditingBObj(o); setShowObjForm(true);
  };

  const handleSaveBObj = async () => {
    if (!bobjName.trim()) return;
    setBobjSaving(true);
    try {
      const params: Record<string, any> = {};
      if (bobjArea) params.area = Number(bobjArea);
      if (bobjCeil) params.ceiling_height = Number(bobjCeil);
      const body = {
        name: bobjName.trim(),
        objectType: bobjType,
        classification: bobjClass || undefined,
        parentId: bobjParent ? Number(bobjParent) : undefined,
        constructionSiteId: objectId,
        projectId,
        floorNumber: bobjFloor ? Number(bobjFloor) : undefined,
        description: bobjDesc || undefined,
        parameters: Object.keys(params).length ? params : undefined,
      };
      if (editingBObj) {
        const res = await api.put(`/objects/${editingBObj.id}`, body);
        setBuildingObjs((prev) => prev.map((o) => o.id === editingBObj.id ? { ...o, ...res.data } : o));
        addToast('success', 'Объект обновлён');
      } else {
        const res = await api.post('/objects', body);
        setBuildingObjs((prev) => [...prev, res.data]);
        addToast('success', 'Объект создан');
      }
      setShowObjForm(false); resetBobjForm(); setEditingBObj(null);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg.join('; ') : (msg || 'Ошибка'));
    } finally { setBobjSaving(false); }
  };

  const handleDeleteBObj = async (id: number, name: string) => {
    if (!confirm(`Удалить объект «${name}»?`)) return;
    try {
      await api.delete(`/objects/${id}`);
      setBuildingObjs((prev) => prev.filter((o) => o.id !== id));
      addToast('success', 'Объект удалён');
    } catch { addToast('error', 'Ошибка при удалении'); }
  };

  /* ── Facilities CRUD ── */
  const resetFacForm = () => { setFacName(''); setFacType('electrical_panel'); setFacLocation(''); setFacDesc(''); setFacObjectId(buildingObjs[0] ? String(buildingObjs[0].id) : ''); };

  const openFacCreate = () => { resetFacForm(); setEditingFac(null); setShowFacForm(true); };
  const openFacEdit = (f: Facility) => {
    setFacName(f.name); setFacType(f.facilityType || 'electrical_panel');
    setFacLocation(f.location || ''); setFacDesc(f.description || '');
    setFacObjectId(String(f.objectId)); setEditingFac(f); setShowFacForm(true);
  };

  const handleSaveFac = async () => {
    if (!facName.trim()) return;
    setFacSaving(true);
    try {
      const body = { name: facName.trim(), facilityType: facType, location: facLocation || undefined, description: facDesc || undefined, objectId: Number(facObjectId) };
      if (editingFac) {
        const res = await api.put(`/facilities/${editingFac.id}`, { name: facName.trim(), facilityType: facType, location: facLocation || undefined, description: facDesc || undefined });
        setFacilities((prev) => prev.map((f) => f.id === editingFac.id ? { ...f, ...res.data } : f));
        addToast('success', 'Сооружение обновлено');
      } else {
        const res = await api.post('/facilities', body);
        setFacilities((prev) => [...prev, res.data]);
        addToast('success', 'Сооружение создано');
      }
      setShowFacForm(false); resetFacForm(); setEditingFac(null);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg.join('; ') : (msg || 'Ошибка'));
    } finally { setFacSaving(false); }
  };

  const handleDeleteFac = async (id: number, name: string) => {
    if (!confirm(`Удалить сооружение «${name}»?`)) return;
    try {
      await api.delete(`/facilities/${id}`);
      setFacilities((prev) => prev.filter((f) => f.id !== id));
      addToast('success', 'Сооружение удалено');
    } catch { addToast('error', 'Ошибка при удалении'); }
  };

  /* ── Components CRUD ── */
  const handleAddComponent = async (facilityId: number) => {
    if (!compName.trim() || !compPos) return;
    setCompSaving(true);
    try {
      const res = await api.post(`/facilities/${facilityId}/components`, { name: compName.trim(), componentType: compType, position: Number(compPos), description: compDesc || undefined });
      setFacilities((prev) => prev.map((f) => f.id === facilityId ? { ...f, components: [...(f.components || []), res.data].sort((a, b) => a.position - b.position) } : f));
      setShowCompForm(null); setCompName(''); setCompType('module'); setCompPos(''); setCompDesc('');
      addToast('success', 'Компонент добавлен');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg.join('; ') : (msg || 'Ошибка'));
    } finally { setCompSaving(false); }
  };

  const handleDeleteComponent = async (facilityId: number, componentId: number) => {
    if (!confirm('Удалить компонент?')) return;
    try {
      await api.delete(`/facilities/${facilityId}/components/${componentId}`);
      setFacilities((prev) => prev.map((f) => f.id === facilityId ? { ...f, components: (f.components || []).filter((c) => c.id !== componentId) } : f));
      addToast('success', 'Компонент удалён');
    } catch { addToast('error', 'Ошибка при удалении'); }
  };

  /* ── Docs ── */
  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const form = new FormData(); form.append('files', file);
      const res = await api.post('/chat-channels/upload', form);
      const uploaded = Array.isArray(res.data) ? res.data[0] : res.data;
      setDocFileUrl(uploaded?.fileUrl || uploaded?.url || '');
      if (!docTitle) setDocTitle(file.name);
    } catch { addToast('error', 'Ошибка загрузки файла'); }
  };

  const handleCreateDoc = async () => {
    if (!docTitle.trim()) return;
    setDocSaving(true);
    try {
      const res = await api.post('/documents', { title: docTitle.trim(), documentType: docType || undefined, fileUrl: docFileUrl || undefined, projectId, constructionSiteId: objectId, status: 'active' });
      setDocs((prev) => [res.data, ...prev]);
      setDocTitle(''); setDocType(''); setDocFileUrl(''); setShowDocForm(false);
      addToast('success', 'Документ добавлен');
    } catch { addToast('error', 'Ошибка при добавлении документа'); }
    finally { setDocSaving(false); }
  };

  const handleDeleteDoc = async (id: number) => {
    if (!confirm('Удалить документ?')) return;
    try { await api.delete(`/documents/${id}`); setDocs((prev) => prev.filter((d) => d.id !== id)); addToast('success', 'Документ удалён'); }
    catch { addToast('error', 'Ошибка при удалении'); }
  };

  /* ── Media ── */
  const handleMediaFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUploadingMedia(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData(); form.append('files', file);
        const res = await api.post('/chat-channels/upload', form);
        const uploaded = Array.isArray(res.data) ? res.data[0] : res.data;
        const url = uploaded?.fileUrl || uploaded?.url;
        if (url) newUrls.push(url);
      }
      if (newUrls.length) {
        const fresh = await api.get(`/construction-sites/${objectId}`);
        const existing: string[] = fresh.data?.photos || [];
        const updated = [...existing, ...newUrls];
        await api.put(`/construction-sites/${objectId}`, { photos: updated });
        setObj((prev) => prev ? { ...prev, photos: updated } : prev);
        addToast('success', `Загружено ${newUrls.length} файлов`);
      }
    } catch { addToast('error', 'Ошибка при загрузке'); }
    finally { setUploadingMedia(false); if (mediaInputRef.current) mediaInputRef.current.value = ''; }
  };

  const handleDeletePhoto = async (url: string) => {
    if (!confirm('Удалить этот файл?')) return;
    try {
      const fresh = await api.get(`/construction-sites/${objectId}`);
      const existing: string[] = fresh.data?.photos || [];
      const updated = existing.filter((u) => u !== url);
      await api.put(`/construction-sites/${objectId}`, { photos: updated });
      setObj((prev) => prev ? { ...prev, photos: updated } : prev);
      addToast('success', 'Файл удалён');
    } catch { addToast('error', 'Ошибка при удалении'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div>;
  }
  if (!obj) return null;

  const statusInfo = STATUS_LABELS[obj.status ?? 0] ?? STATUS_LABELS[0];
  const photos: string[] = Array.isArray(obj.photos) ? obj.photos : [];

  /* Tree helpers: root = objects with no parentId in this site */
  const rootObjs = buildingObjs.filter((o) => !o.parent || !buildingObjs.find((b) => b.id === (o.parent as any)?.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2 flex-wrap">
            <button onClick={() => router.push('/dashboard/projects')} className="hover:text-violet-500 transition-colors">Проекты</button>
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <button onClick={() => router.push(`/dashboard/projects/${projectId}?tab=objects`)} className="hover:text-violet-500 transition-colors truncate max-w-[180px]">
              {project?.code ? `${project.code} | ` : ''}{project?.name ?? `Проект #${projectId}`}
            </button>
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-[180px]">{obj.name}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{obj.name}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
          </div>
          {obj.address && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{obj.address}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => router.push(`/dashboard/projects/${projectId}?tab=objects`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Назад
          </button>
          <button onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            {editing ? 'Отмена' : 'Редактировать'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-6">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Основная информация</h3>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Название *</label>
                  <input autoFocus className="form-input w-full" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Адрес *</label>
                  <input className="form-input w-full" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Код</label>
                    <input className="form-input w-full" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Статус</label>
                    <select className="form-select w-full" value={editStatus} onChange={(e) => setEditStatus(Number(e.target.value))}>
                      <option value={0}>Планирование</option>
                      <option value={1}>В работе</option>
                      <option value={2}>Приостановлен</option>
                      <option value={3}>Завершён</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Описание</label>
                  <textarea className="form-input w-full resize-y" rows={4} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors">Отмена</button>
                  <button onClick={handleSave} disabled={saving || !editName.trim()} className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            ) : (
              <dl className="space-y-3">
                <Row label="Название" value={obj.name} />
                <Row label="Адрес" value={obj.address ?? '—'} />
                <Row label="Код" value={obj.code ?? '—'} />
                <Row label="Тип" value={obj.siteType ?? '—'} />
                <Row label="Статус" value={<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>} />
                {obj.description && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">Описание</dt>
                    <dd className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{obj.description}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-6">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Сроки</h3>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Дата начала</label>
                  <input type="date" className="form-input w-full" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Плановое окончание</label>
                  <input type="date" className="form-input w-full" value={editPlannedEnd} onChange={(e) => setEditPlannedEnd(e.target.value)} />
                </div>
              </div>
            ) : (
              <dl className="space-y-3">
                <Row label="Дата начала" value={obj.startDate ? new Date(obj.startDate).toLocaleDateString('ru-RU') : '—'} />
                <Row label="Плановое окончание" value={obj.plannedEndDate ? new Date(obj.plannedEndDate).toLocaleDateString('ru-RU') : '—'} />
                <Row label="Фактическое окончание" value={obj.actualEndDate ? new Date(obj.actualEndDate).toLocaleDateString('ru-RU') : '—'} />
                {obj.areaSize != null && <Row label="Площадь (м²)" value={String(obj.areaSize)} />}
              </dl>
            )}
          </div>
        </div>
      )}

      {/* ── Structure (BuildingObjects) ── */}
      {activeTab === 'objects' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">
                Структура объекта
                {buildingObjs.length > 0 && <span className="ml-2 text-sm font-normal text-gray-400">({buildingObjs.length})</span>}
              </h2>
              <button onClick={openBobjCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Добавить
              </button>
            </div>

            {/* Create/Edit form */}
            {showObjForm && (
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/20">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">{editingBObj ? 'Редактировать объект' : 'Новый объект'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Название *</label>
                    <input autoFocus className="form-input w-full" value={bobjName} onChange={(e) => setBobjName(e.target.value)} placeholder="Спальня, Этаж 1..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Тип</label>
                    <select className="form-select w-full" value={bobjType} onChange={(e) => setBobjType(e.target.value)}>
                      {Object.entries(OBJ_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Классификация</label>
                    <input className="form-input w-full" value={bobjClass} onChange={(e) => setBobjClass(e.target.value)} placeholder="спальня, кухня, офис..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Родительский объект</label>
                    <select className="form-select w-full" value={bobjParent} onChange={(e) => setBobjParent(e.target.value)}>
                      <option value="">— Нет (корневой) —</option>
                      {buildingObjs.filter((b) => b.id !== editingBObj?.id).map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Этаж</label>
                    <input type="number" className="form-input w-full" value={bobjFloor} onChange={(e) => setBobjFloor(e.target.value)} placeholder="1" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Площадь (м²)</label>
                    <input type="number" step="0.1" className="form-input w-full" value={bobjArea} onChange={(e) => setBobjArea(e.target.value)} placeholder="25.5" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Высота потолка (м)</label>
                    <input type="number" step="0.1" className="form-input w-full" value={bobjCeil} onChange={(e) => setBobjCeil(e.target.value)} placeholder="2.7" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Описание</label>
                    <input className="form-input w-full" value={bobjDesc} onChange={(e) => setBobjDesc(e.target.value)} placeholder="Краткое описание..." />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleSaveBObj} disabled={bobjSaving || !bobjName.trim()}
                    className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                    {bobjSaving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button onClick={() => { setShowObjForm(false); setEditingBObj(null); resetBobjForm(); }}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors">Отмена</button>
                </div>
              </div>
            )}

            {objsLoading ? (
              <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" /></div>
            ) : buildingObjs.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Структура не добавлена. Добавьте первый объект.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {buildingObjs.map((bobj) => {
                  const statusColor = OBJ_STATUS_COLOR[bobj.status || 'planned'] || OBJ_STATUS_COLOR.planned;
                  const statusLabel = OBJ_STATUS_LABEL[bobj.status || 'planned'] || 'Запланировано';
                  const parentName = bobj.parent?.name;
                  const isExpanded = expandedBObj === bobj.id;
                  return (
                    <div key={bobj.id}>
                      <div className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                        <button onClick={() => setExpandedBObj(isExpanded ? null : bobj.id)}
                          className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{bobj.name}</span>
                            <span className="text-xs text-gray-400">{OBJ_TYPE_LABEL[bobj.objectType || 'custom']}</span>
                            {bobj.classification && <span className="text-xs text-gray-400 italic">{bobj.classification}</span>}
                            <Badge label={statusLabel} color={statusColor} />
                          </div>
                          {parentName && <p className="text-xs text-gray-400 mt-0.5">↳ {parentName}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openBobjEdit(bobj)} className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors" title="Редактировать">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteBObj(bobj.id, bobj.name)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Удалить">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-5 pb-4 pt-1 bg-gray-50/50 dark:bg-gray-900/10">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                            {bobj.parameters?.area != null && <Param label="Площадь" value={`${bobj.parameters.area} м²`} />}
                            {bobj.parameters?.ceiling_height != null && <Param label="Высота потолка" value={`${bobj.parameters.ceiling_height} м`} />}
                            {bobj.floorNumber != null && <Param label="Этаж" value={String(bobj.floorNumber)} />}
                            {bobj.parameters?.wall_material && <Param label="Стены" value={bobj.parameters.wall_material} />}
                            {bobj.parameters?.floor_material && <Param label="Пол" value={bobj.parameters.floor_material} />}
                            {bobj.parameters?.window_count != null && <Param label="Окна" value={String(bobj.parameters.window_count)} />}
                            {bobj.parameters?.door_count != null && <Param label="Двери" value={String(bobj.parameters.door_count)} />}
                          </div>
                          {bobj.description && <p className="text-xs text-gray-500 dark:text-gray-400">{bobj.description}</p>}
                          {(bobj.facilities?.length ?? 0) > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Сооружения:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {bobj.facilities!.map((f) => (
                                  <span key={f.id} className="text-xs bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded">
                                    {f.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Facilities ── */}
      {activeTab === 'facilities' && (
        <div className="space-y-4">
          {buildingObjs.length === 0 && !objsLoading && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-5 py-3 text-sm text-amber-700 dark:text-amber-300">
              Сначала добавьте объекты в разделе «Структура», затем можно добавлять сооружения к ним.
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">
                Уникальные сооружения
                {facilities.length > 0 && <span className="ml-2 text-sm font-normal text-gray-400">({facilities.length})</span>}
              </h2>
              {buildingObjs.length > 0 && (
                <button onClick={openFacCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Добавить сооружение
                </button>
              )}
            </div>

            {/* Facility form */}
            {showFacForm && (
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/20">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">{editingFac ? 'Редактировать сооружение' : 'Новое сооружение'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Название *</label>
                    <input autoFocus className="form-input w-full" value={facName} onChange={(e) => setFacName(e.target.value)} placeholder="Щит освещения..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Тип</label>
                    <select className="form-select w-full" value={facType} onChange={(e) => setFacType(e.target.value)}>
                      {Object.entries(FAC_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  {!editingFac && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Объект *</label>
                      <select className="form-select w-full" value={facObjectId} onChange={(e) => setFacObjectId(e.target.value)}>
                        {buildingObjs.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Местоположение</label>
                    <input className="form-input w-full" value={facLocation} onChange={(e) => setFacLocation(e.target.value)} placeholder="коридор, стена слева" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Описание</label>
                    <input className="form-input w-full" value={facDesc} onChange={(e) => setFacDesc(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleSaveFac} disabled={facSaving || !facName.trim()}
                    className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                    {facSaving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button onClick={() => { setShowFacForm(false); setEditingFac(null); resetFacForm(); }}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors">Отмена</button>
                </div>
              </div>
            )}

            {facLoading || objsLoading ? (
              <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" /></div>
            ) : facilities.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Сооружений нет</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {facilities.map((fac) => {
                  const facBobj = buildingObjs.find((b) => b.id === fac.objectId);
                  const isExpanded = expandedFac === fac.id;
                  const statusColor = FAC_STATUS_COLOR[fac.status || 'planned'] || FAC_STATUS_COLOR.planned;
                  const statusLabel = FAC_STATUS_LABEL[fac.status || 'planned'] || 'Запланировано';
                  return (
                    <div key={fac.id}>
                      <div className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                        <button onClick={() => setExpandedFac(isExpanded ? null : fac.id)}
                          className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{fac.name}</span>
                            <span className="text-xs text-gray-400">{FAC_TYPE_LABEL[fac.facilityType || 'custom']}</span>
                            <Badge label={statusLabel} color={statusColor} />
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {facBobj && <span className="text-xs text-gray-400">📍 {facBobj.name}</span>}
                            {fac.location && <span className="text-xs text-gray-400">{fac.location}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openFacEdit(fac)} className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors" title="Редактировать">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteFac(fac.id, fac.name)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Удалить">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>

                      {/* Expanded: components */}
                      {isExpanded && (
                        <div className="px-5 pb-4 pt-2 bg-gray-50/50 dark:bg-gray-900/10">
                          {fac.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{fac.description}</p>}
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Компоненты ({(fac.components || []).length})</p>
                            <button onClick={() => { setShowCompForm(fac.id); setCompName(''); setCompType('module'); setCompPos(''); setCompDesc(''); }}
                              className="text-xs text-violet-500 hover:text-violet-600 font-medium transition-colors">+ Добавить</button>
                          </div>

                          {/* Add component form */}
                          {showCompForm === fac.id && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-3">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Тип</label>
                                  <select className="form-select w-full text-xs" value={compType} onChange={(e) => setCompType(e.target.value)}>
                                    <option value="module">Модуль</option>
                                    <option value="loop">Петля</option>
                                    <option value="duct">Воздуховод</option>
                                    <option value="filter">Фильтр</option>
                                    <option value="fan">Вентилятор</option>
                                    <option value="valve">Клапан</option>
                                    <option value="custom">Другое</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Позиция *</label>
                                  <input type="number" className="form-input w-full text-xs" value={compPos} onChange={(e) => setCompPos(e.target.value)} placeholder="1" />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Название *</label>
                                  <input autoFocus className="form-input w-full text-xs" value={compName} onChange={(e) => setCompName(e.target.value)} placeholder="Вводной автомат, Тёплый пол кухня..." />
                                </div>
                                <div className="col-span-2 sm:col-span-4">
                                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Описание</label>
                                  <input className="form-input w-full text-xs" value={compDesc} onChange={(e) => setCompDesc(e.target.value)} placeholder="Тип автомата, нагрузка, и т.д." />
                                </div>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => handleAddComponent(fac.id)} disabled={compSaving || !compName.trim() || !compPos}
                                  className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
                                  {compSaving ? '...' : 'Добавить'}
                                </button>
                                <button onClick={() => setShowCompForm(null)}
                                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">Отмена</button>
                              </div>
                            </div>
                          )}

                          {/* Components list */}
                          {(fac.components || []).length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 py-2">Компонентов нет</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                    <th className="py-1.5 pr-3 text-left font-semibold w-10">#</th>
                                    <th className="py-1.5 pr-3 text-left font-semibold">Название</th>
                                    <th className="py-1.5 pr-3 text-left font-semibold">Тип</th>
                                    <th className="py-1.5 pr-3 text-left font-semibold">Описание</th>
                                    <th className="py-1.5 text-left font-semibold">Статус</th>
                                    <th className="py-1.5 w-8"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                                  {(fac.components || []).map((c) => (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                                      <td className="py-1.5 pr-3 text-gray-400 font-mono">{c.position}</td>
                                      <td className="py-1.5 pr-3 text-gray-800 dark:text-gray-100 font-medium">{c.name}</td>
                                      <td className="py-1.5 pr-3 text-gray-500 dark:text-gray-400">{c.componentType || '—'}</td>
                                      <td className="py-1.5 pr-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{c.description || '—'}</td>
                                      <td className="py-1.5">
                                        <Badge label={FAC_STATUS_LABEL[c.status || 'planned'] || c.status || '—'} color={FAC_STATUS_COLOR[c.status || 'planned'] || FAC_STATUS_COLOR.planned} />
                                      </td>
                                      <td className="py-1.5">
                                        <button onClick={() => handleDeleteComponent(fac.id, c.id)}
                                          className="p-1 text-gray-300 hover:text-red-500 transition-colors" title="Удалить">
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tasks ── */}
      {activeTab === 'tasks' && (
        <TasksPanel constructionSiteId={objectId} projectId={obj?.projectId} title="Задачи объекта" />
      )}

      {/* ── Documents ── */}
      {activeTab === 'documents' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Документы объекта</h2>
            <button onClick={() => setShowDocForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Добавить
            </button>
          </div>
          {showDocForm && (
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Название *</label>
                  <input autoFocus className="form-input w-full" placeholder="Название документа" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Тип</label>
                  <input className="form-input w-full" placeholder="Например: договор, акт, смета" value={docType} onChange={(e) => setDocType(e.target.value)} />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Файл</label>
                <input ref={docFileRef} type="file" className="hidden" onChange={handleDocFileChange} />
                <div className="flex items-center gap-3">
                  <button onClick={() => docFileRef.current?.click()} className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:border-violet-400 text-gray-600 dark:text-gray-400 transition-colors">Выбрать файл</button>
                  {docFileUrl && <span className="text-xs text-green-600 dark:text-green-400 truncate max-w-xs">Файл загружен</span>}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={handleCreateDoc} disabled={docSaving || !docTitle.trim()} className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                  {docSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button onClick={() => { setShowDocForm(false); setDocTitle(''); setDocType(''); setDocFileUrl(''); }} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors">Отмена</button>
              </div>
            </div>
          )}
          {docsLoading ? (
            <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" /></div>
          ) : docs.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Документов нет</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                    <th className="py-3 px-4 text-left font-semibold">Название</th>
                    <th className="py-3 px-4 text-left font-semibold">Тип</th>
                    <th className="py-3 px-4 text-left font-semibold">Дата</th>
                    <th className="py-3 px-4 text-left font-semibold"></th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {docs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                      <td className="py-3 px-4 text-gray-800 dark:text-gray-100 font-medium">{doc.title}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{doc.documentType ?? '—'}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('ru-RU') : '—'}</td>
                      <td className="py-3 px-4">{doc.fileUrl && <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:text-violet-600 text-xs font-medium">Открыть</a>}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Удалить">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Media ── */}
      {activeTab === 'media' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Медиа объекта</h2>
            <div>
              <input ref={mediaInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaFiles} />
              <button onClick={() => mediaInputRef.current?.click()} disabled={uploadingMedia}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                {uploadingMedia ? 'Загрузка...' : 'Загрузить'}
              </button>
            </div>
          </div>
          {photos.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Медиафайлов нет</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                  {isImageUrl(url) ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </a>
                  ) : (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                      <span className="text-xs">Видео</span>
                    </a>
                  )}
                  <button onClick={() => handleDeletePhoto(url)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex transition-colors" title="Удалить">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-800 dark:text-gray-100 text-right">{value}</dd>
    </div>
  );
}

function Param({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700">
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mt-0.5">{value}</p>
    </div>
  );
}
