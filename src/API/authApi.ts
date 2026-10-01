import axiosClient from "./axiosClient";
import type { LoginRequest, LoginResponse } from "../types/api";

export const login = (data: LoginRequest) => {
    return axiosClient.post<LoginResponse>("/auth/login", data);
};