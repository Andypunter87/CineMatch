import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, insertUserSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  updateStreamingMutation: UseMutationResult<User, Error, string[]>;
  updateCountryMutation: UseMutationResult<User, Error, string>;
  changePasswordMutation: UseMutationResult<User, Error, PasswordChangeData>;
};

// Create schemas for validation
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = insertUserSchema.omit({ username: true }).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  
  // Make streaming services and country optional, with empty defaults
  // This will be set during onboarding instead
  streamingServices: z.array(z.string()).default([]).optional(),
  country: z.string().default("").optional(),
  
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the Terms of Service and Privacy Policy"
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], 
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

type PasswordChangeData = {
  currentPassword: string;
  newPassword: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back${user.name ? ', ' + user.name : ''}!`,
      });
      
      // Track login event
      trackEvent(AnalyticsEvents.USER_LOGGED_IN, {
        user_id: user.id,
        has_name: !!user.name,
        has_streaming_services: (user.streamingServices && user.streamingServices.length > 0) || false,
        has_country: !!user.country
      });
      
      // Redirect to home page after successful login
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const { confirmPassword, acceptTerms, ...userData } = credentials;
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome to CineMatch${user.name ? ', ' + user.name : ''}!`,
      });
      
      // Track registration event
      trackEvent(AnalyticsEvents.USER_REGISTERED, {
        user_id: user.id,
        has_name: !!user.name,
        has_streaming_services: (user.streamingServices && user.streamingServices.length > 0) || false,
        has_country: !!user.country,
        streaming_services_count: (user.streamingServices && user.streamingServices.length) || 0
      });
      
      // Redirect to home page after successful registration
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create your account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStreamingMutation = useMutation({
    mutationFn: async (streamingServices: string[]) => {
      const res = await apiRequest("PUT", "/api/user/streaming", { streamingServices });
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Preferences updated",
        description: "Your streaming services have been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCountryMutation = useMutation({
    mutationFn: async (country: string) => {
      const res = await apiRequest("PUT", "/api/user/country", { country });
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Country updated",
        description: "Your country preference has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeData) => {
      const res = await apiRequest("PUT", "/api/user/password", data);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Password updated",
        description: "Your password has been successfully changed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password change failed",
        description: error.message || "Current password may be incorrect",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateStreamingMutation,
        updateCountryMutation,
        changePasswordMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Already exported