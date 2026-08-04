import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Auto-attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("isoko_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login (but not if already on /admin or /login)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/admin" && currentPath !== "/login") {
        localStorage.removeItem("isoko_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (data: { email: string; username: string; password: string; full_name?: string; phone?: string }) =>
    api.post("/api/auth/register", data),
  login: (email: string, password: string) =>
    api.post<{ access_token: string; refresh_token: string }>("/api/auth/login", { email, password }),
  socialLogin: (email: string, name: string, provider: string, token: string) =>
    api.post<{ access_token: string; refresh_token: string }>("/api/auth/social-login", {
      email,
      name,
      provider,
      id_token: token,
    }),
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersAPI = {
  me: () => api.get("/api/users/me"),
  updateMe: (data: object) => api.patch("/api/users/me", data),
  getUser: (id: number) => api.get(`/api/users/${id}`),
  getAll: () => api.get("/api/users/"),
  updateRole: (id: number, role: string) => api.patch(`/api/users/${id}/role`, { role }),
};

// ─── Listings ────────────────────────────────────────────────────────────────

export const listingsAPI = {
  getAll: (params?: {
    category_id?: number;
    city?: string;
    min_price?: number;
    max_price?: number;
    search?: string;
    skip?: number;
    limit?: number;
  }) => api.get("/api/listings/", { params }),

  getForMap: (category_id?: number) =>
    api.get("/api/listings/map", { params: category_id ? { category_id } : {} }),

  getOne: (id: number) => api.get(`/api/listings/${id}`),

  create: (data: object) => api.post("/api/listings/", data),

  uploadImages: (listingId: number, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    return api.post(`/api/listings/${listingId}/images`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  delete: (id: number) => api.delete(`/api/listings/${id}`),

  update: (id: number, data: object) => api.patch(`/api/listings/${id}`, data),

  // Annonce invité (sans authentification)
  createGuest: (data: object) => api.post("/api/listings/guest", data),

  getCategories: () => api.get("/api/listings/categories/all"),
  getCategoriesTree: () => api.get("/api/listings/categories/tree"),
  createCategory: (data: {
    name: string;
    name_fr?: string;
    name_en?: string;
    icon?: string;
    color?: string;
    parent_id?: number | null;
  }) => api.post("/api/listings/categories", data),
  updateCategory: (
    id: number,
    data: {
      name?: string;
      name_fr?: string | null;
      icon?: string | null;
      color?: string | null;
      parent_id?: number | null;
    }
  ) => api.patch(`/api/listings/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/api/listings/categories/${id}`),
};

// ─── Merchants ───────────────────────────────────────────────────────────────

export const merchantsAPI = {
  getAll: () => api.get("/api/merchants/"),
  getOne: (id: number) => api.get(`/api/merchants/${id}`),
  getListings: (id: number) => api.get(`/api/merchants/${id}/listings`),
  create: (data: object) => api.post("/api/merchants/", data),
  updateMe: (data: object) => api.patch("/api/merchants/me", data),
  deleteMe: () => api.delete("/api/merchants/me"),
  updateSubscription: (subscription_pack: string) => api.put("/api/merchants/subscription", { subscription_pack }),
};

// ─── Messages ────────────────────────────────────────────────────────────────

export const messagesAPI = {
  getConversations: () => api.get("/api/messages/conversations"),
  getThread: (partnerId: number, params?: { skip?: number; limit?: number }) =>
    api.get(`/api/messages/${partnerId}`, { params }),
  send: (data: { receiver_id: number; content: string; listing_id?: number }) =>
    api.post("/api/messages/", data),
};

// ─── Map ─────────────────────────────────────────────────────────────────────

export const mapAPI = {
  getRoute: (params: {
    start_lat: number;
    start_lng: number;
    end_lat: number;
    end_lng: number;
    mode?: "driving" | "cycling" | "foot";
  }) => api.get("/api/map/route", { params }),

  reverseGeocode: (lat: number, lng: number) =>
    api.get("/api/map/geocode", { params: { lat, lng } }),

  searchPlace: (q: string) =>
    api.get("/api/map/search", { params: { q } }),
};

export const reviewsAPI = {
  getReviews: (listingId: number) => api.get(`/api/listings/${listingId}/reviews`),
  postReview: (listingId: number, data: { rating: number; comment?: string }) =>
    api.post(`/api/listings/${listingId}/reviews`, data),
  postReport: (listingId: number, data: { report_type: "report" | "claim"; reason: string }) =>
    api.post(`/api/listings/${listingId}/reports`, data),
};

// ─── Médiathèque ─────────────────────────────────────────────────────────────

export const mediaAPI = {
  /** Liste tous les médias (optionnel: filtrer par category) */
  getAll: (category?: string) =>
    api.get("/api/media/", { params: category ? { category } : {} }),

  /** Statistiques globales de la médiathèque */
  getStats: () => api.get("/api/media/stats"),

  /** Upload un ou plusieurs fichiers */
  upload: (files: File[], category = "library", listingId?: number) => {
    const form = new FormData();
    files.forEach((f) => form.append("file", f));
    const params: Record<string, string | number> = { category };
    if (listingId) params.listing_id = listingId;
    return api.post("/api/media/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      params,
    });
  },

  /** Supprime un fichier par son id */
  delete: (id: number) => api.delete(`/api/media/${id}`),
};

export default api;

