import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

export interface CreateLectureRequest {
  course_id: string;
  title: string;
  date: string; // YYYY-MM-DD
  file_url?: string;
  file_name?: string;
  file_size?: string;
  file_type?: string;
}

export interface UpdateLectureRequest {
  title?: string;
  date?: string;
  file_url?: string;
  file_name?: string;
  file_size?: string;
  file_type?: string;
}

export interface Lecture {
  id: string;
  course_id: string;
  course_name?: string;
  course_code?: string;
  title: string;
  date: string;
  file_url: string | null;
  file_name: string | null;
  file_size: string | null;
  file_type: string | null;
  created_at: string;
  updated_at: string;
}

// Get lectures for a course
export const getCourseLectures = async (courseId: string) => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        l.id,
        l.course_id,
        c.name AS course_name,
        c.code AS course_code,
        l.title,
        l.date,
        l.file_url,
        l.file_name,
        l.file_size,
        l.file_type,
        l.created_at,
        l.updated_at
       FROM lectures l
       JOIN courses c ON l.course_id = c.id
       WHERE l.course_id = ? AND l.deleted_at IS NULL
       ORDER BY l.date DESC, l.created_at DESC`,
      [courseId]
    );

    return rows.map((row: any) => ({
      id: row.id,
      course_id: row.course_id,
      course_name: row.course_name,
      course_code: row.course_code,
      title: row.title,
      date: row.date,
      file_url: row.file_url,
      file_name: row.file_name,
      file_size: row.file_size,
      file_type: row.file_type,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting course lectures:', error);
    throw error;
  }
};

// Get lecture by ID
export const getLectureById = async (lectureId: string): Promise<Lecture | null> => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        l.id,
        l.course_id,
        c.name AS course_name,
        c.code AS course_code,
        l.title,
        l.date,
        l.file_url,
        l.file_name,
        l.file_size,
        l.file_type,
        l.created_at,
        l.updated_at
       FROM lectures l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = ? AND l.deleted_at IS NULL`,
      [lectureId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      course_id: row.course_id,
      course_name: row.course_name,
      course_code: row.course_code,
      title: row.title,
      date: row.date,
      file_url: row.file_url,
      file_name: row.file_name,
      file_size: row.file_size,
      file_type: row.file_type,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch (error) {
    console.error('Error getting lecture:', error);
    throw error;
  }
};

// Get all lectures for a teacher
export const getTeacherLectures = async (teacherId: string) => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        l.id,
        l.course_id,
        c.name AS course_name,
        c.code AS course_code,
        l.title,
        l.date,
        l.file_url,
        l.file_name,
        l.file_size,
        l.file_type,
        l.created_at,
        l.updated_at
       FROM lectures l
       JOIN courses c ON l.course_id = c.id
       WHERE c.teacher_id = ? AND l.deleted_at IS NULL AND c.deleted_at IS NULL
       ORDER BY l.date DESC, l.created_at DESC`,
      [teacherId]
    );

    return rows.map((row: any) => ({
      id: row.id,
      course_id: row.course_id,
      course_name: row.course_name,
      course_code: row.course_code,
      title: row.title,
      date: row.date,
      file_url: row.file_url,
      file_name: row.file_name,
      file_size: row.file_size,
      file_type: row.file_type,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting teacher lectures:', error);
    throw error;
  }
};

// Create lecture
export const createLecture = async (
  teacherId: string,
  lectureData: CreateLectureRequest,
  file?: any
): Promise<Lecture> => {
  try {
    // Verify course exists and teacher is assigned to it
    const [course] = await pool.execute<any[]>(
      `SELECT id, code, name, teacher_id
       FROM courses
       WHERE id = ? AND deleted_at IS NULL`,
      [lectureData.course_id]
    );

    if (course.length === 0) {
      throw new Error('Course not found');
    }

    if (course[0].teacher_id !== teacherId) {
      throw new Error('You are not assigned to this course');
    }

    if (!lectureData.title || !lectureData.date) {
      throw new Error('Title and date are required');
    }

    const lectureId = `lecture_${Date.now()}`;

    // Handle file upload
    if (file) {
      const crypto = require('crypto');
      const uploadDir = path.join(__dirname, '../../storage/private/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const fileId = crypto.randomUUID();
      const extension = path.extname(file.originalname).toLowerCase();
      const fileName = `${fileId}${extension}`;
      const filePath = path.join(uploadDir, fileName);
      
      fs.writeFileSync(filePath, file.buffer);
      lectureData.file_url = `/api/lectures/student/lectureId/download`; // We'll update the DB to store just the file name or a generic path, but since the frontend might expect a URL, we can store the identifier. Actually, it's better to store just the `fileName` in `file_url` so we know the UUID. Let's set it to just the fileName.
      lectureData.file_url = fileName;
      lectureData.file_name = file.originalname;
      lectureData.file_size = file.size.toString();
      // Truncate file_type to 50 characters to fit in database column
      lectureData.file_type = file.mimetype.substring(0, 50);
    }

    await pool.execute(
      `INSERT INTO lectures (id, course_id, title, \`date\`, file_url, file_name, file_size, file_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lectureId,
        lectureData.course_id,
        lectureData.title,
        lectureData.date,
        lectureData.file_url || null,
        lectureData.file_name || null,
        lectureData.file_size || null,
        lectureData.file_type || null,
      ]
    );

    const newLecture = await getLectureById(lectureId);
    if (!newLecture) {
      throw new Error('Failed to retrieve the newly created lecture');
    }

    return newLecture;
  } catch (error: any) {
    console.error('Error creating lecture:', error);
    throw error;
  }
};

// Update lecture
export const updateLecture = async (
  lectureId: string,
  teacherId: string,
  lectureData: UpdateLectureRequest
): Promise<Lecture> => {
  try {
    // Verify lecture exists and teacher owns the course
    const [lecture] = await pool.execute<any[]>(
      `SELECT l.id, c.teacher_id
       FROM lectures l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = ? AND l.deleted_at IS NULL`,
      [lectureId]
    );

    if (lecture.length === 0) {
      throw new Error('Lecture not found');
    }

    if (lecture[0].teacher_id !== teacherId) {
      throw new Error('You are not authorized to update this lecture');
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (lectureData.title !== undefined) {
      updates.push('title = ?');
      params.push(lectureData.title);
    }
    if (lectureData.date !== undefined) {
      updates.push('date = ?');
      params.push(lectureData.date);
    }
    if (lectureData.file_url !== undefined) {
      updates.push('file_url = ?');
      params.push(lectureData.file_url || null);
    }
    if (lectureData.file_name !== undefined) {
      updates.push('file_name = ?');
      params.push(lectureData.file_name || null);
    }
    if (lectureData.file_size !== undefined) {
      updates.push('file_size = ?');
      params.push(lectureData.file_size || null);
    }
    if (lectureData.file_type !== undefined) {
      updates.push('file_type = ?');
      params.push(lectureData.file_type || null);
    }

    if (updates.length === 0) {
      const existing = await getLectureById(lectureId);
      if (!existing) {
        throw new Error('Lecture not found');
      }
      return existing;
    }

    params.push(lectureId);

    await pool.execute(
      `UPDATE lectures SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      params
    );

    const updated = await getLectureById(lectureId);
    if (!updated) {
      throw new Error('Failed to retrieve updated lecture');
    }

    return updated;
  } catch (error: any) {
    console.error('Error updating lecture:', error);
    throw error;
  }
};

// Delete lecture (soft delete)
export const deleteLecture = async (lectureId: string, teacherId: string) => {
  try {
    // Verify lecture exists and teacher owns the course
    const [lecture] = await pool.execute<any[]>(
      `SELECT l.id, c.teacher_id
       FROM lectures l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = ? AND l.deleted_at IS NULL`,
      [lectureId]
    );

    if (lecture.length === 0) {
      throw new Error('Lecture not found');
    }

    if (lecture[0].teacher_id !== teacherId) {
      throw new Error('You are not authorized to delete this lecture');
    }

    await pool.execute(
      `UPDATE lectures SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [lectureId]
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting lecture:', error);
    throw error;
  }
};