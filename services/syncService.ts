
import { ClassRoom, School, Student } from "../types";
import { supabase } from "./supabaseClient";

/**
 * Sincroniza todos os dados de forma relacional no Supabase.
 */
export const syncDataWithServer = async (schools: School[], classes: ClassRoom[]): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const userId = user.id;

    // 1. Sincronizar Escolas
    if (schools.length > 0) {
      const schoolsToSync = schools.map(s => ({ id: s.id, user_id: userId, name: s.name }));
      const { error: schoolError } = await supabase.from('schools').upsert(schoolsToSync);
      if (schoolError) throw schoolError;
    }

    // 2. Sincronizar Turmas
    if (classes.length > 0) {
      const classesToSync = classes.map(c => ({
        id: c.id,
        school_id: c.schoolId,
        user_id: userId,
        name: c.name,
        subject: c.subject,
        year: c.year,
        activity_count: c.activityCount,
        status: c.status,
        activity_metadata: c.activityMetadata,
        last_modified: c.lastModified
      }));
      const { error: classError } = await supabase.from('classes').upsert(classesToSync);
      if (classError) throw classError;

      // 3. Sincronizar Alunos (Extraídos de dentro das turmas)
      const allStudents: any[] = [];
      classes.forEach(cls => {
        cls.students.forEach(std => {
          allStudents.push({
            id: std.id,
            class_id: cls.id, // ID da Turma Vinculado
            user_id: userId,
            name: std.name,
            bimesters: std.bimesters,
            rec1: std.rec1,
            rec2: std.rec2,
            final_exam: std.finalExam
          });
        });
      });

      if (allStudents.length > 0) {
        const { error: studentError } = await supabase.from('students').upsert(allStudents);
        if (studentError) throw studentError;
      }
    }
    
    return true;
  } catch (e) {
    console.error("Erro na sincronização relacional:", e);
    return false;
  }
};

/**
 * Busca todos os dados estruturados do servidor.
 */
export const fetchRemoteData = async (): Promise<{ schools: School[], classes: ClassRoom[] } | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Busca escolas
    const { data: schoolData, error: sErr } = await supabase.from('schools').select('*');
    if (sErr) throw sErr;

    // Busca turmas
    const { data: classData, error: cErr } = await supabase.from('classes').select('*');
    if (cErr) throw cErr;

    // Busca alunos
    const { data: studentData, error: stdErr } = await supabase.from('students').select('*');
    if (stdErr) throw stdErr;

    const formattedSchools: School[] = (schoolData || []).map(s => ({ id: s.id, name: s.name }));

    const formattedClasses: ClassRoom[] = (classData || []).map(c => {
      // Filtra os alunos que pertencem a esta turma específica
      const studentsInClass: Student[] = (studentData || [])
        .filter(std => std.class_id === c.id)
        .map(std => ({
          id: std.id,
          name: std.name,
          bimesters: std.bimesters,
          rec1: std.rec1,
          rec2: std.rec2,
          finalExam: std.final_exam
        }));

      return {
        id: c.id,
        schoolId: c.school_id,
        name: c.name,
        subject: c.subject,
        year: c.year,
        activityCount: c.activity_count,
        status: c.status,
        activityMetadata: c.activity_metadata,
        lastModified: c.last_modified,
        students: studentsInClass
      };
    });

    return { schools: formattedSchools, classes: formattedClasses };
  } catch (e) {
    console.error("Erro ao carregar dados relacionais:", e);
    return null;
  }
};

export const checkConnectivity = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};
