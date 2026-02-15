
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, GraduationCap, ChevronLeft, LayoutDashboard, Trash2, 
  UserPlus, Sparkles, X, Users, ListPlus, Star, Info, Calendar, Edit3, FileText,
  LogOut, Lock, Mail, ArrowRight, AlertCircle, Wifi, WifiOff, RefreshCw, CheckCircle2,
  School as SchoolIcon, Archive, FolderOpen, Search, ArrowLeftRight
} from 'lucide-react';
import { ClassRoom, Student, View, BimesterTab, GradePeriod, ActivityMeta, SyncStatus, School } from './types';
import { Button } from './components/Button';
import { analyzeClassPerformance } from './services/geminiService';
import { syncDataWithServer, checkConnectivity } from './services/syncService';

interface UserAccount {
  email: string;
  password: string;
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [view, setView] = useState<View>('schoolList');
  const [activeTab, setActiveTab] = useState<BimesterTab>(1);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [currentClass, setCurrentClass] = useState<ClassRoom | null>(null);
  
  const [isOnline, setIsOnline] = useState<boolean>(checkConnectivity());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [bulkStudentNames, setBulkStudentNames] = useState('');
  
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<{ bimester: 1|2|3|4, index: number } | null>(null);
  const [tempMeta, setTempMeta] = useState<ActivityMeta>({ date: '', content: '' });

  const [isCreateSchoolModalOpen, setIsCreateSchoolModalOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const auth = localStorage.getItem('edugrade_auth_user');
    if (auth) setIsLoggedIn(true);

    const savedClasses = localStorage.getItem('edugrade_v2_data');
    if (savedClasses) setClasses(JSON.parse(savedClasses));

    const savedSchools = localStorage.getItem('edugrade_v2_schools');
    if (savedSchools) setSchools(JSON.parse(savedSchools));
  }, []);

  useEffect(() => {
    localStorage.setItem('edugrade_v2_data', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('edugrade_v2_schools', JSON.stringify(schools));
  }, [schools]);

  const performSync = useCallback(async () => {
    if (!isOnline || syncStatus !== 'pending') return;
    setSyncStatus('syncing');
    try {
      const success = await syncDataWithServer(classes);
      if (success) setSyncStatus('synced');
      else setSyncStatus('pending');
    } catch (e) {
      setSyncStatus('pending');
    }
  }, [isOnline, syncStatus, classes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (syncStatus === 'pending') performSync();
    }, 3000);
    return () => clearTimeout(timer);
  }, [syncStatus, performSync]);

  const notifyDataChange = (updatedClasses: ClassRoom[]) => {
    setClasses(updatedClasses);
    setSyncStatus(isOnline ? 'pending' : 'offline');
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const usersJson = localStorage.getItem('edugrade_users_list');
    const users: UserAccount[] = usersJson ? JSON.parse(usersJson) : [];
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setIsLoggedIn(true);
      localStorage.setItem('edugrade_auth_user', email);
      setAuthError(null);
      setView('schoolList');
    } else {
      setAuthError('E-mail ou senha incorretos.');
    }
  };

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    if (password !== confirmPassword) {
      setAuthError('As senhas não coincidem.');
      return;
    }
    const usersJson = localStorage.getItem('edugrade_users_list');
    const users: UserAccount[] = usersJson ? JSON.parse(usersJson) : [];
    if (users.find(u => u.email === email)) {
      setAuthError('Este e-mail já está cadastrado.');
      return;
    }
    const newUsers = [...users, { email, password }];
    localStorage.setItem('edugrade_users_list', JSON.stringify(newUsers));
    setIsLoggedIn(true);
    localStorage.setItem('edugrade_auth_user', email);
    setAuthError(null);
    setView('schoolList');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('edugrade_auth_user');
    setView('schoolList');
    setSelectedSchoolId(null);
    setCurrentClass(null);
    setAuthMode('login');
  };

  const handleCreateSchool = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('schoolName') as string;
    const newSchool: School = { id: crypto.randomUUID(), name };
    setSchools([...schools, newSchool]);
    setIsCreateSchoolModalOpen(false);
  };

  const handleCreateClass = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSchoolId) return;
    const formData = new FormData(e.currentTarget);
    const initialCount = 3;
    const newClass: ClassRoom = {
      id: crypto.randomUUID(),
      schoolId: selectedSchoolId,
      name: formData.get('name') as string,
      subject: formData.get('subject') as string,
      year: formData.get('year') as string,
      activityCount: initialCount,
      status: 'active',
      lastModified: Date.now(),
      activityMetadata: {
        1: Array(initialCount).fill({ date: '', content: '' }),
        2: Array(initialCount).fill({ date: '', content: '' }),
        3: Array(initialCount).fill({ date: '', content: '' }),
        4: Array(initialCount).fill({ date: '', content: '' }),
      },
      students: []
    };
    notifyDataChange([...classes, newClass]);
    setView('list');
  };

  const handleArchiveClass = (id: string) => {
    if (!confirm('Deseja realmente arquivar esta turma? Ela não aparecerá mais no diário principal.')) return;
    const updated = classes.map(c => c.id === id ? { ...c, status: 'archived' as const, lastModified: Date.now() } : c);
    notifyDataChange(updated);
  };

  const handleRestoreClass = (id: string) => {
    const updated = classes.map(c => c.id === id ? { ...c, status: 'active' as const, lastModified: Date.now() } : c);
    notifyDataChange(updated);
  };

  const updateClass = (updated: ClassRoom) => {
    updated.lastModified = Date.now();
    const newClasses = classes.map(c => c.id === updated.id ? updated : c);
    notifyDataChange(newClasses);
    setCurrentClass(updated);
  };

  const handleAddStudents = () => {
    if (!currentClass) return;
    const names = bulkStudentNames.split('\n').map(n => n.trim()).filter(n => n !== '');
    const newStudents: Student[] = names.map(name => ({
      id: crypto.randomUUID(),
      name,
      bimesters: {
        1: { activities: Array(currentClass.activityCount).fill(null), exam: null, extra: null },
        2: { activities: Array(currentClass.activityCount).fill(null), exam: null, extra: null },
        3: { activities: Array(currentClass.activityCount).fill(null), exam: null, extra: null },
        4: { activities: Array(currentClass.activityCount).fill(null), exam: null, extra: null },
      },
      rec1: null, rec2: null, finalExam: null
    }));
    updateClass({ ...currentClass, students: [...currentClass.students, ...newStudents] });
    setBulkStudentNames('');
    setIsAddStudentModalOpen(false);
  };

  const handleAddActivityColumn = () => {
    if (!currentClass) return;
    const newCount = currentClass.activityCount + 1;
    const updatedMetadata = { ...currentClass.activityMetadata };
    [1, 2, 3, 4].forEach(b => {
      // @ts-ignore
      updatedMetadata[b] = [...updatedMetadata[b], { date: '', content: '' }];
    });
    const updatedStudents = currentClass.students.map(student => ({
      ...student,
      bimesters: {
        1: { ...student.bimesters[1], activities: [...student.bimesters[1].activities, null] },
        2: { ...student.bimesters[2], activities: [...student.bimesters[2].activities, null] },
        3: { ...student.bimesters[3], activities: [...student.bimesters[3].activities, null] },
        4: { ...student.bimesters[4], activities: [...student.bimesters[4].activities, null] },
      }
    }));
    updateClass({ ...currentClass, activityCount: newCount, activityMetadata: updatedMetadata, students: updatedStudents });
  };

  const calcBimesterAvg = (period: GradePeriod) => {
    const validActs = period.activities.filter(v => v !== null) as number[];
    const avgActs = validActs.length > 0 ? validActs.reduce((a, b) => a + b, 0) / validActs.length : 0;
    const exam = period.exam || 0;
    const extra = period.extra || 0;
    return ((avgActs + exam) / 2) + extra;
  };

  const getEffectiveBimesterGrade = (student: Student, b: 1 | 2 | 3 | 4) => {
    const raw = calcBimesterAvg(student.bimesters[b]);
    if (b === 1 || b === 2) {
      if (student.rec1 === null) return raw;
      const b1 = calcBimesterAvg(student.bimesters[1]);
      const b2 = calcBimesterAvg(student.bimesters[2]);
      const rec = student.rec1;
      if (b === 1 && b1 < rec && b1 <= b2) return rec;
      if (b === 2 && b2 < rec && b2 < b1) return rec;
      return raw;
    }
    if (b === 3 || b === 4) {
      if (student.rec2 === null) return raw;
      const b3 = calcBimesterAvg(student.bimesters[3]);
      const b4 = calcBimesterAvg(student.bimesters[4]);
      const rec = student.rec2;
      if (b === 3 && b3 < rec && b3 <= b4) return rec;
      if (b === 4 && b4 < rec && b4 < b3) return rec;
      return raw;
    }
    return raw;
  };

  const handleOpenEditActivity = (b: 1|2|3|4, idx: number) => {
    if (!currentClass) return;
    const meta = currentClass.activityMetadata[b][idx] || { date: '', content: '' };
    setEditingActivity({ bimester: b, index: idx });
    setTempMeta(meta);
    setIsEditActivityModalOpen(true);
  };

  const handleSaveActivityMeta = () => {
    if (!currentClass || !editingActivity) return;
    const { bimester, index } = editingActivity;
    const newMetadata = { ...currentClass.activityMetadata };
    newMetadata[bimester][index] = tempMeta;
    updateClass({ ...currentClass, activityMetadata: newMetadata });
    setIsEditActivityModalOpen(false);
  };

  const renderAuth = () => (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-white to-slate-50">
      <div className="w-full max-w-lg bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 animate-in zoom-in slide-in-from-bottom-12 duration-700">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl shadow-slate-900/20 mb-6">
            <GraduationCap className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">EduGrade</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">
            {authMode === 'login' ? 'Acesso ao Professor' : 'Criar Nova Conta'}
          </p>
        </div>
        {authError && (
          <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-600 px-6 py-4 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-bold">{authError}</p>
          </div>
        )}
        <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-6">
          <div className="space-y-5">
            <div className="relative group">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input name="email" type="email" required placeholder="E-mail profissional" className="w-full bg-slate-50 text-slate-900 border-2 border-slate-50 rounded-[2rem] pl-16 pr-6 py-5 font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400" />
            </div>
            <div className="relative group">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input name="password" type="password" required placeholder="Sua senha secreta" className="w-full bg-slate-50 text-slate-900 border-2 border-slate-50 rounded-[2rem] pl-16 pr-6 py-5 font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400" />
            </div>
            {authMode === 'register' && (
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input name="confirmPassword" type="password" required placeholder="Confirme sua senha" className="w-full bg-slate-50 text-slate-900 border-2 border-slate-50 rounded-[2rem] pl-16 pr-6 py-5 font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400" />
              </div>
            )}
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white rounded-[2.5rem] py-6 font-black text-lg shadow-2xl shadow-slate-900/20 hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center group">
            {authMode === 'login' ? 'Entrar no Sistema' : 'Finalizar Cadastro'}
            <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
          </button>
          <div className="text-center pt-4">
            <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(null); }} className="text-sm font-black text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-6 py-2 rounded-full">
              {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderSchoolList = () => (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Em qual escola estamos hoje?</h1>
        <p className="text-slate-500 font-medium text-lg">Selecione uma escola para gerenciar suas turmas específicas.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {schools.map(school => (
          <div 
            key={school.id} 
            onClick={() => { setSelectedSchoolId(school.id); setView('list'); }}
            className="group relative bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 opacity-50" />
            <div className="relative z-10">
              <div className="bg-indigo-600 w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white mb-8 shadow-lg shadow-indigo-600/20">
                <SchoolIcon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">{school.name}</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                {classes.filter(c => c.schoolId === school.id && c.status === 'active').length} Turmas Ativas
              </p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); if(confirm('Excluir escola e todas as suas turmas?')) {
                setSchools(schools.filter(s => s.id !== school.id));
                notifyDataChange(classes.filter(c => c.schoolId !== school.id));
              }}}
              className="absolute bottom-10 right-10 text-slate-300 hover:text-rose-500 transition-colors p-2"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
        <div 
          onClick={() => setIsCreateSchoolModalOpen(true)}
          className="border-4 border-dashed border-slate-200 rounded-[3rem] p-10 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-400 transition-all cursor-pointer group"
        >
          <div className="bg-slate-100 p-6 rounded-full group-hover:bg-indigo-50 transition-colors mb-6">
            <Plus className="w-10 h-10" />
          </div>
          <span className="text-xl font-black uppercase tracking-widest text-center">Cadastrar Nova Escola</span>
        </div>
      </div>
    </div>
  );

  const renderClassList = () => {
    const school = schools.find(s => s.id === selectedSchoolId);
    const filteredClasses = classes.filter(c => c.schoolId === selectedSchoolId && c.status === 'active');
    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SchoolIcon className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{school?.name}</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Turmas Ativas</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setView('schoolList')} className="rounded-2xl border-slate-200">
              <ArrowLeftRight className="w-4 h-4 mr-2" /> Trocar Escola
            </Button>
            <Button variant="ghost" onClick={() => setView('archive')} className="rounded-2xl border-slate-200">
              <Archive className="w-4 h-4 mr-2" /> Arquivadas
            </Button>
            <Button onClick={() => setView('create')} className="rounded-2xl shadow-lg shadow-indigo-600/20">
              <Plus className="w-4 h-4 mr-2" /> Nova Turma
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredClasses.map(cls => (
            <div key={cls.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col" onClick={() => { setCurrentClass(cls); setView('detail'); }}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-black text-2xl text-slate-900 leading-tight">{cls.name}</h3>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); handleArchiveClass(cls.id); }} className="text-slate-300 hover:text-amber-500 transition-colors p-2 rounded-xl hover:bg-amber-50" title="Arquivar Turma">
                    <Archive className="w-5 h-5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir permanentemente?')) notifyDataChange(classes.filter(c => c.id !== cls.id)); }} className="text-slate-300 hover:text-rose-500 transition-colors p-2 rounded-xl hover:bg-rose-50" title="Excluir">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="mb-8">
                <span className="text-indigo-600 font-black text-[10px] bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest">{cls.subject}</span>
              </div>
              <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="flex items-center text-slate-400 font-bold text-xs gap-4">
                  <span className="flex items-center bg-slate-100 px-3 py-1 rounded-lg"><Users className="w-4 h-4 mr-2 opacity-50" /> {cls.students.length} Alunos</span>
                  <span className="bg-slate-100 px-3 py-1 rounded-lg uppercase">{cls.year}</span>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-200 group-hover:translate-x-1 group-hover:text-indigo-500 transition-all" />
              </div>
            </div>
          ))}
          {filteredClasses.length === 0 && (
            <div className="col-span-full py-32 text-center text-slate-300 border-4 border-dashed rounded-[3rem] border-slate-100 bg-slate-50/50">
               <FolderOpen className="w-20 h-20 mx-auto mb-6 opacity-20" />
               <p className="text-xl font-bold">Nenhuma turma ativa nesta escola.</p>
               <Button variant="ghost" onClick={() => setView('create')} className="mt-6 text-indigo-600">Criar minha primeira turma</Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderArchive = () => {
    const archivedClasses = classes.filter(c => c.schoolId === selectedSchoolId && c.status === 'archived');
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setView('list')} className="rounded-2xl hover:bg-white border-2 border-transparent hover:border-slate-100">
            <ChevronLeft className="w-5 h-5 mr-2" /> Voltar
          </Button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Baú de Turmas (Arquivadas)</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {archivedClasses.map(cls => (
            <div key={cls.id} className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 transition-all grayscale opacity-70 hover:grayscale-0 hover:opacity-100 hover:border-indigo-300">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-black text-2xl text-slate-500 leading-tight">{cls.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleRestoreClass(cls.id)} className="text-emerald-500 hover:bg-emerald-50 transition-colors p-2 rounded-xl" title="Restaurar Turma">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button onClick={() => { if(confirm('Excluir definitivamente?')) notifyDataChange(classes.filter(c => c.id !== cls.id)); }} className="text-rose-400 hover:bg-rose-50 transition-colors p-2 rounded-xl" title="Excluir Permanentemente">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <span className="text-slate-400 font-bold text-[10px] bg-slate-100 px-3 py-1.5 rounded-full uppercase tracking-widest">{cls.subject}</span>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-auto pt-4 border-t border-slate-200">Ano: {cls.year}</p>
            </div>
          ))}
          {archivedClasses.length === 0 && (
            <div className="col-span-full py-32 text-center text-slate-300">
               <Archive className="w-20 h-20 mx-auto mb-6 opacity-10" />
               <p className="text-xl font-bold">Seu arquivo está vazio.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSyncIndicator = () => {
    if (!isOnline) return (
      <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100 animate-pulse">
        <WifiOff className="w-3 h-3" />
        <span className="text-[10px] font-black uppercase tracking-widest">Offline</span>
      </div>
    );
    switch(syncStatus) {
      case 'syncing': return (
        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando</span>
        </div>
      );
      case 'pending': return (
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-500 rounded-full border border-slate-200">
          <RefreshCw className="w-3 h-3" />
          <span className="text-[10px] font-black uppercase tracking-widest">Pendente</span>
        </div>
      );
      case 'synced': default: return (
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
          <CheckCircle2 className="w-3 h-3" />
          <span className="text-[10px] font-black uppercase tracking-widest">Sincronizado</span>
        </div>
      );
    }
  };

  const renderDetail = () => {
    if (!currentClass) return null;
    return (
      <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => setView('list')} className="mr-4 hover:bg-slate-200"><ChevronLeft className="w-5 h-5" /></Button>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{currentClass.name}</h2>
              <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">{currentClass.subject}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTab !== 'annual' && (
              <Button variant="secondary" onClick={handleAddActivityColumn} size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 border-none">
                <ListPlus className="w-4 h-4 mr-2" /> + Atividade
              </Button>
            )}
            <Button variant="secondary" onClick={() => setIsAddStudentModalOpen(true)} size="sm" className="font-bold border-slate-300"><UserPlus className="w-4 h-4 mr-2" /> Importar Alunos</Button>
            <Button disabled={!isOnline} onClick={async () => { setIsAnalyzing(true); setAiReport(await analyzeClassPerformance(currentClass)); setIsAnalyzing(false); }} size="sm" className={`bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border-none text-white shadow-md ${!isOnline && 'opacity-50 grayscale'}`}>
              <Sparkles className="w-4 h-4 mr-2" /> {isAnalyzing ? 'Analisando...' : 'IA Mentor'}
            </Button>
          </div>
        </div>
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar bg-white rounded-t-3xl px-4 pt-4">
          {[1, 2, 3, 4, 'annual'].map(t => (
            <button key={t} onClick={() => { setActiveTab(t as BimesterTab); setAiReport(null); }} className={`px-8 py-4 text-sm font-black whitespace-nowrap transition-all border-b-4 ${activeTab === t ? 'border-indigo-600 text-indigo-600 translate-y-px' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t === 'annual' ? 'CONSOLIDADO ANUAL' : `${t}º BIMESTRE`}
            </button>
          ))}
        </div>
        {aiReport && (
          <div className="bg-slate-900 p-8 rounded-3xl border border-indigo-500/30 shadow-2xl relative text-white animate-in zoom-in duration-300">
            <button onClick={() => setAiReport(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            <div className="flex items-center gap-3 mb-6 text-indigo-400 font-black uppercase tracking-[0.2em] text-xs"><Sparkles className="w-5 h-5" /> Relatório Estratégico IA</div>
            <div className="prose prose-invert prose-indigo max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{aiReport}</div>
          </div>
        )}
        <div className="bg-white rounded-b-3xl border border-slate-200 shadow-xl overflow-hidden mb-20">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5 font-black text-slate-700 min-w-[260px] sticky left-0 bg-slate-50 z-20 shadow-[4px_0_10px_rgba(0,0,0,0.03)] uppercase tracking-wider">Estudante</th>
                  {activeTab !== 'annual' ? (
                    <>
                      {Array.from({ length: currentClass.activityCount }).map((_, i) => {
                        const meta = currentClass.activityMetadata[activeTab as 1|2|3|4]?.[i];
                        return (
                          <th key={i} onClick={() => handleOpenEditActivity(activeTab as 1|2|3|4, i)} className="px-3 py-5 text-center w-28 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors group relative">
                            <div className="flex flex-col items-center gap-1">
                               <span>Ativ {i + 1}</span>
                               {meta?.date && <span className="text-[8px] text-indigo-500 bg-indigo-50 px-1 rounded">{meta.date}</span>}
                               <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 absolute top-2 right-2 text-indigo-400" />
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-3 py-5 text-center w-28 bg-indigo-50 font-black text-indigo-700 uppercase tracking-widest">Prova</th>
                      <th className="px-3 py-5 text-center w-24 bg-amber-50 font-black text-amber-700 uppercase tracking-widest">
                        <div className="flex flex-col items-center"><Star className="w-4 h-4 mb-1" /><span>Extra</span></div>
                      </th>
                      <th className="px-8 py-5 text-center w-40 font-black text-indigo-900 bg-indigo-100 uppercase tracking-widest">Média Bim.</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-5 text-center font-bold text-slate-400 uppercase tracking-tighter">B1</th>
                      <th className="px-3 py-5 text-center font-bold text-slate-400 uppercase tracking-tighter">B2</th>
                      <th className="px-3 py-5 text-center bg-amber-50 text-amber-700 font-black uppercase tracking-tighter">REC 1</th>
                      <th className="px-3 py-5 text-center font-bold text-slate-400 uppercase tracking-tighter">B3</th>
                      <th className="px-3 py-5 text-center font-bold text-slate-400 uppercase tracking-tighter">B4</th>
                      <th className="px-3 py-5 text-center bg-amber-50 text-amber-700 font-black uppercase tracking-tighter">REC 2</th>
                      <th className="px-6 py-5 text-center font-black bg-indigo-50 text-indigo-700 uppercase tracking-tighter">Soma</th>
                      <th className="px-3 py-5 text-center bg-rose-50 text-rose-700 font-black uppercase tracking-tighter">P. Final</th>
                      <th className="px-8 py-5 text-center font-black text-white bg-slate-900 uppercase tracking-widest">Resultado</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentClass.students.map(student => {
                  if (activeTab === 'annual') {
                    const b1 = getEffectiveBimesterGrade(student, 1);
                    const b2 = getEffectiveBimesterGrade(student, 2);
                    const b3 = getEffectiveBimesterGrade(student, 3);
                    const b4 = getEffectiveBimesterGrade(student, 4);
                    const totalSoma = b1 + b2 + b3 + b4;
                    const mediaAnual = totalSoma / 4;
                    const needsFinal = mediaAnual < 7;
                    const mediaFinal = needsFinal ? (mediaAnual + (student.finalExam || 0)) / 2 : mediaAnual;
                    const approved = mediaFinal >= 5;
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5 font-bold text-slate-800 sticky left-0 bg-white z-20 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">{student.name}</td>
                        <td className="px-3 py-5 text-center text-slate-400 font-bold">{b1.toFixed(1)}</td>
                        <td className="px-3 py-5 text-center text-slate-400 font-bold">{b2.toFixed(1)}</td>
                        <td className="px-3 py-3 text-center bg-amber-50/30">
                          <input type="number" step="0.1" className="w-16 text-center bg-slate-900 text-white border border-slate-700 rounded-xl py-2 font-black outline-none" value={student.rec1 ?? ''} onChange={e => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            updateClass({...currentClass, students: currentClass.students.map(s => s.id === student.id ? {...s, rec1: val} : s)});
                          }} />
                        </td>
                        <td className="px-3 py-5 text-center text-slate-400 font-bold">{b3.toFixed(1)}</td>
                        <td className="px-3 py-5 text-center text-slate-400 font-bold">{b4.toFixed(1)}</td>
                        <td className="px-3 py-3 text-center bg-amber-50/30">
                          <input type="number" step="0.1" className="w-16 text-center bg-slate-900 text-white border border-slate-700 rounded-xl py-2 font-black outline-none" value={student.rec2 ?? ''} onChange={e => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            updateClass({...currentClass, students: currentClass.students.map(s => s.id === student.id ? {...s, rec2: val} : s)});
                          }} />
                        </td>
                        <td className={`px-6 py-5 text-center font-black text-lg bg-indigo-50/30 ${totalSoma >= 28 ? 'text-green-600' : 'text-rose-600'}`}>{totalSoma.toFixed(1)}</td>
                        <td className="px-3 py-3 text-center bg-rose-50/30">
                          {needsFinal ? (
                            <input type="number" step="0.1" className="w-16 text-center bg-slate-900 text-white border border-slate-700 rounded-xl py-2 font-black outline-none" value={student.finalExam ?? ''} onChange={e => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              updateClass({...currentClass, students: currentClass.students.map(s => s.id === student.id ? {...s, finalExam: val} : s)});
                            }} />
                          ) : <span className="text-slate-300 font-black">OK</span>}
                        </td>
                        <td className="px-8 py-5 text-center bg-slate-900/5">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-sm ${approved ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'}`}>{approved ? 'Aprovado' : 'Reprovado'}</span>
                        </td>
                      </tr>
                    );
                  }
                  const bimesterKey = activeTab as 1 | 2 | 3 | 4;
                  const period = student.bimesters[bimesterKey];
                  const avg = calcBimesterAvg(period);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5 font-bold text-slate-800 sticky left-0 bg-white z-20 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">{student.name}</td>
                      {period.activities.map((val, idx) => (
                        <td key={idx} className="px-1.5 py-3 text-center">
                          <input type="number" step="0.1" className="w-16 text-center bg-slate-900 text-white border border-slate-700 rounded-xl py-2 font-black outline-none" value={val ?? ''} onChange={e => {
                            const newVal = e.target.value === '' ? null : parseFloat(e.target.value);
                            const updatedActs = [...period.activities];
                            updatedActs[idx] = newVal;
                            updateClass({...currentClass, students: currentClass.students.map(s => s.id === student.id ? {...s, bimesters: {...s.bimesters, [bimesterKey]: {...period, activities: updatedActs}}} : s)});
                          }} />
                        </td>
                      ))}
                      <td className="px-1.5 py-3 text-center bg-indigo-50/50">
                         <input type="number" step="0.1" className="w-16 text-center bg-slate-900 text-white border border-indigo-500/40 rounded-xl py-2 font-black outline-none" value={period.exam ?? ''} onChange={e => {
                            const newVal = e.target.value === '' ? null : parseFloat(e.target.value);
                            updateClass({...currentClass, students: currentClass.students.map(s => s.id === student.id ? {...s, bimesters: {...s.bimesters, [bimesterKey]: {...period, exam: newVal}}} : s)});
                          }} />
                      </td>
                      <td className="px-1.5 py-3 text-center bg-amber-50/50">
                         <input type="number" step="0.1" className="w-16 text-center bg-slate-900 text-white border border-amber-400/40 rounded-xl py-2 font-black outline-none" value={period.extra ?? ''} onChange={e => {
                            const newVal = e.target.value === '' ? null : parseFloat(e.target.value);
                            updateClass({...currentClass, students: currentClass.students.map(s => s.id === student.id ? {...s, bimesters: {...s.bimesters, [bimesterKey]: {...period, extra: newVal}}} : s)});
                          }} />
                      </td>
                      <td className="px-8 py-5 text-center font-black text-indigo-700 bg-indigo-100/40 text-lg">{avg.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {currentClass.students.length === 0 && (
            <div className="py-20 text-center text-slate-400">
               <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="font-bold">Ainda não há alunos nesta turma.</p>
               <Button variant="ghost" size="sm" onClick={() => setIsAddStudentModalOpen(true)} className="mt-2 text-indigo-600">Importar lista agora</Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isLoggedIn) return renderAuth();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-600 selection:text-white pb-20">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-[100] px-8 h-20 flex items-center justify-between shadow-sm backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setSelectedSchoolId(null); setView('schoolList'); }}>
          <div className="bg-slate-900 p-2.5 rounded-2xl text-white group-hover:rotate-6 transition-all shadow-lg shadow-slate-900/20"><GraduationCap className="w-7 h-7" /></div>
          <div>
            <span className="font-black text-2xl tracking-tighter block leading-none">EduGrade</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full tracking-widest uppercase">Professor Pro</span>
              <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full truncate max-w-[120px]">{localStorage.getItem('edugrade_auth_user')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {renderSyncIndicator()}
          <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-2.5 rounded-2xl border-2 border-slate-100 text-slate-500 font-bold hover:bg-slate-50 hover:text-rose-500 hover:border-rose-100 transition-all">
            <LogOut className="w-5 h-5" /> Sair
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-10">
        {view === 'schoolList' && renderSchoolList()}
        {view === 'list' && renderClassList()}
        {view === 'archive' && renderArchive()}
        {view === 'create' && (
          <div className="max-w-xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 animate-in zoom-in slide-in-from-bottom-10 duration-500">
            <h2 className="text-3xl font-black mb-10 text-slate-900 tracking-tight text-center">Configurar Turma</h2>
            <form onSubmit={handleCreateClass} className="space-y-8">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Escola Atual</label>
                <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100 flex items-center gap-3">
                   <SchoolIcon className="w-5 h-5 text-indigo-500" />
                   <span className="font-bold text-slate-900">{schools.find(s => s.id === selectedSchoolId)?.name}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Nome da Turma</label>
                <input name="name" required placeholder="Ex: 3º Ano Ensino Médio" className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Disciplina</label>
                  <input name="subject" required placeholder="Matemática" className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Ano Letivo</label>
                  <input name="year" defaultValue={new Date().getFullYear()} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 font-bold focus:bg-white focus:border-indigo-600 outline-none transition-all" />
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <Button type="submit" className="flex-1 py-5 text-lg font-black bg-slate-900 rounded-3xl">Salvar Turma</Button>
                <Button variant="ghost" type="button" onClick={() => setView('list')} className="px-8 font-bold">Voltar</Button>
              </div>
            </form>
          </div>
        )}
        {view === 'detail' && renderDetail()}
      </main>

      {/* Modais */}
      {isCreateSchoolModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
             <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="font-black text-2xl text-slate-900">Nova Escola</h3>
               <button onClick={() => setIsCreateSchoolModalOpen(false)} className="bg-white p-2 rounded-xl text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleCreateSchool} className="p-10 space-y-6">
               <div>
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nome da Instituição</label>
                 <input name="schoolName" required placeholder="Ex: Escola Estadual Machado de Assis" className="w-full bg-slate-900 text-white border-2 border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none" />
               </div>
               <Button className="w-full py-4 font-black bg-indigo-600 rounded-2xl">Cadastrar Escola</Button>
             </form>
          </div>
        </div>
      )}

      {isAddStudentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-20 duration-500">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-3xl text-slate-900">Carga de Alunos</h3>
              <button onClick={() => setIsAddStudentModalOpen(false)} className="bg-white p-3 rounded-2xl text-slate-400 hover:text-rose-500"><X className="w-7 h-7" /></button>
            </div>
            <div className="p-10">
              <textarea className="w-full h-80 bg-slate-900 text-white border border-slate-700 rounded-[2rem] p-8 text-lg font-mono focus:ring-8 focus:ring-indigo-500/10 outline-none" placeholder="Alice Moreira&#10;Bernardo Souza..." value={bulkStudentNames} onChange={e => setBulkStudentNames(e.target.value)} />
            </div>
            <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-6">
              <Button variant="ghost" className="flex-1 py-5 font-black text-slate-400" onClick={() => setIsAddStudentModalOpen(false)}>Descartar</Button>
              <Button className="flex-1 py-5 font-black bg-indigo-600 rounded-3xl" onClick={handleAddStudents}>Gerar {bulkStudentNames.split('\n').filter(n=>n.trim()).length} Alunos</Button>
            </div>
          </div>
        </div>
      )}

      {isEditActivityModalOpen && editingActivity && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-2xl text-slate-900">Atividade {editingActivity.index + 1}</h3>
              <button onClick={() => setIsEditActivityModalOpen(false)} className="bg-white p-2 rounded-xl text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-10 space-y-6">
              <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2"><Calendar className="w-3 h-3 mr-1 inline" /> Data</label><input type="text" placeholder="Ex: 12/05" className="w-full bg-slate-900 text-white border border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none" value={tempMeta.date} onChange={e => setTempMeta({...tempMeta, date: e.target.value})} /></div>
              <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2"><FileText className="w-3 h-3 mr-1 inline" /> Conteúdo</label><textarea rows={4} placeholder="Ex: Equações" className="w-full bg-slate-900 text-white border border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none resize-none" value={tempMeta.content} onChange={e => setTempMeta({...tempMeta, content: e.target.value})} /></div>
            </div>
            <div className="p-10 bg-slate-50 border-t border-slate-100"><Button className="w-full py-4 font-black bg-indigo-600 rounded-2xl" onClick={handleSaveActivityMeta}>Salvar Detalhes</Button></div>
          </div>
        </div>
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }input[type=number] { -moz-appearance: textfield; }@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }.animate-in { animation: fade-in 0.3s ease-out; }`}</style>
    </div>
  );
};

export default App;
