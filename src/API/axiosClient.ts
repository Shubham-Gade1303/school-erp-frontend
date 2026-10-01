import axios from "axios";

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("school_erp_token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

axiosClient.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            localStorage.removeItem("school_erp_token");
            window.dispatchEvent(new Event("school-erp:unauthorized"));

            if (window.location.pathname !== "/login") {
                window.location.replace("/login");
            }
        }

        if (axios.isAxiosError(error) && error.response?.status === 403) {
            window.dispatchEvent(new Event("school-erp:forbidden"));
        }

        return Promise.reject(error);
    },
);

export default axiosClient;