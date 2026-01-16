// /lib/utils/api.ts

class ApiError extends Error {
  status: number;
  details?: any;
  
  constructor(message: string, status: number, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'ApiError';
  }
}

export async function apiFetch<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  console.log('📡 API Request:', { 
    url, 
    method: options.method || 'GET'
  });

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });

    console.log('📡 API Response Status:', response.status, response.statusText);
    console.log('📡 API Response Headers:', Object.fromEntries(response.headers.entries()));

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.log('🔐 Unauthorized - redirecting to login');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectUrl', window.location.pathname);
        window.location.href = '/login';
      }
      throw new ApiError('Unauthorized. Please login again.', 401);
    }

    // Get response text first
    const responseText = await response.text();
    
    // Check if response is empty
    if (!responseText || responseText.trim() === '') {
      console.warn('⚠️ Empty response received');
      
      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          { emptyResponse: true }
        );
      }
      
      // Return empty object for successful empty responses
      return {} as T;
    }
    
    console.log('📡 API Response Text:', responseText.substring(0, 500));

    // Try to parse JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', {
        text: responseText,
        error: parseError
      });
      
      // Check if it's HTML (server error page)
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        console.error('❌ Server returned HTML instead of JSON');
        throw new ApiError(
          'Server error - received HTML instead of JSON',
          response.status,
          { htmlResponse: true, text: responseText.substring(0, 200) }
        );
      }
      
      throw new ApiError(
        `Invalid JSON response: ${response.statusText}`,
        response.status,
        { responseText, parseError }
      );
    }

    console.log('📡 API Response Data:', responseData);

    // Handle non-2xx responses
    if (!response.ok) {
      // Check for validation errors
      if (response.status === 400 && responseData.fields) {
        throw new ApiError(
          responseData.error || 'Validation failed',
          response.status,
          { fields: responseData.fields, message: responseData.error }
        );
      }
      
      // Check for custom error messages
      if (responseData.message) {
        throw new ApiError(responseData.message, response.status, responseData);
      }
      
      throw new ApiError(
        responseData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        responseData.details || responseData
      );
    }

    return responseData;
  } catch (error: any) {
    console.error('❌ API Fetch Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Check if it's a network error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new ApiError(
        'Network error. Please check your internet connection and try again.',
        0,
        { networkError: true }
      );
    }
    
    // Re-throw ApiError as is
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Wrap other errors
    throw new ApiError(
      error.message || 'Request failed',
      0,
      error
    );
  }
}