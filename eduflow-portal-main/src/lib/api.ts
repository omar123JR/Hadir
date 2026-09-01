// This is the main function that sends requests.
export const apiRequest = async (endpoint: string, options: RequestInit = {} ) => {
  const token = localStorage.getItem('hadir_token');

  // Create a new Headers object. This is the safest way.
  const headers = new Headers(options.headers || {});

  // Set Content-Type if it's not a file upload
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Add the Authorization token if it exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // We use a relative path for the API URL.
  // This is configured in vite.config.ts to point to the backend.
  const API_BASE_URL = '/api';

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers, // Use the new Headers object
  });

  // --- Error Handling ---
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: `API Error: ${response.status} ${response.statusText}` };
    }
    // Throw the error object from the API response
    throw errorData;
  }

  // --- Success Handling ---
  // Handle responses that might not have a body (like DELETE)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  // For non-JSON responses or empty responses, return a success indicator
  return { success: true };
};

// =============================================================
// === API object with simplified methods for you to use ===
// =============================================================
export const api = {
  // For GET requests
  get: (endpoint: string) => apiRequest(endpoint),

  // For POST requests with JSON data
  post: (endpoint: string, data: any) => apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // For PUT requests with JSON data
  put: (endpoint: string, data: any) => apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // For DELETE requests
  delete: (endpoint: string) => apiRequest(endpoint, {
    method: 'DELETE',
  }),

  // For requests that upload files (IMPORTANT!)
  upload: (endpoint: string, formData: FormData) => apiRequest(endpoint, {
    method: 'POST', // or 'PUT'
    body: formData, // Send FormData directly
  }),
};

// =============================================================
// === Course API functions (Corrected Section) ===
// =============================================================

export const getTeacherCourses = async () => {
  // This is the CORRECT endpoint to get the logged-in teacher's courses
  const response = await api.get('/courses/teacher');
  return response.data;
};

export const getStudentCourses = async () => {
  // This is the CORRECT endpoint to get the logged-in student's courses
  const response = await api.get('/courses/student');
  return response.data;
};
