import apiClient from "../api/apiClient";
import type {
  LoginPayload,
  LoginResponse,
  ForgotPasswordPayload,
} from "../types/auth";
import { ApiError } from "../utils/errors";
import { saveAuth, readAuth, clearAuth } from "../utils/storage";
import { useUserStore } from "../store/userStore";

export const logout = async () => {
  const { refreshToken } = readAuth();
  try {
    await apiClient.post("/auth/logout", { refreshToken });
  } catch (error) {
    throw new ApiError("Error al cerrar sesión", 400, error);
  } finally {
    clearAuth();
  }
};

export const login = async (payload: LoginPayload) => {
  try {
    const response = await apiClient.post<LoginResponse>(
      "/auth/login",
      payload
    );
    console.log(response.data);
    saveAuth(response.data, { remember: !!payload.remember });
    try {
      const me = await meAPI(response.data.accessToken);
      useUserStore.getState().setUser(me);
    } catch (e) {
      console.warn("No se pudo cargar el perfil tras login", e);
    }
    return response.data;
  } catch (error) {
    throw new ApiError("Error al iniciar sesión", 401, error);
  }
};

export const forgotPassword = async (payload: ForgotPasswordPayload) => {
  try {
    await apiClient.post("/auth/forgot-password", payload);
  } catch (error) {
    throw new ApiError("Error al enviar el correo", 400, error);
  }
};

export const meAPI = async (token: string) => {
  try {
    const response = await apiClient.get("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`, 
      },
    });
    return response.data; 
  } catch (error) {
    throw new ApiError("Error al obtener información del usuario", 401, error);
  }
};
