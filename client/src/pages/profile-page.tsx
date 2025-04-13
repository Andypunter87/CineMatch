import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2, Save, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Streaming services options (matching those in the questionnaire)
const streamingServices = [
  "Netflix",
  "Amazon Prime",
  "Disney+",
  "Hulu",
  "HBO Max",
  "Apple TV+",
  "Peacock",
  "Paramount+",
  "Crunchyroll",
  "MUBI",
  "Criterion Channel",
  "BBC iPlayer",
  "ITVx",
  "Channel 4",
];

// Countries list (same as in the auth page)
const countries = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Egypt",
  "France",
  "Germany",
  "Japan",
  "Brazil",
  "Mexico",
  "India",
  "South Korea",
  "Italy",
  "Spain",
  "Netherlands",
  "Sweden",
];

// Password change schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export default function ProfilePage() {
  const { user, isLoading, updateStreamingMutation, updateCountryMutation, changePasswordMutation } = useAuth();
  const { toast } = useToast();
  const [editingStreamingServices, setEditingStreamingServices] = useState(false);
  const [editingCountry, setEditingCountry] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>(user?.streamingServices || []);
  const [selectedCountry, setSelectedCountry] = useState<string>(user?.country || "");

  const passwordForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // If user is not authenticated, redirect to auth page
  if (!isLoading && !user) {
    return <Redirect to="/auth" />;
  }

  if (isLoading || !user) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Handle streaming services update
  const handleStreamingServicesUpdate = () => {
    updateStreamingMutation.mutate(selectedServices, {
      onSuccess: () => {
        setEditingStreamingServices(false);
        toast({
          title: "Success",
          description: "Your streaming services have been updated.",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update streaming services.",
          variant: "destructive",
        });
      }
    });
  };

  // Handle country update
  const handleCountryUpdate = () => {
    if (!selectedCountry) {
      toast({
        title: "Error",
        description: "Please select a country.",
        variant: "destructive",
      });
      return;
    }

    updateCountryMutation.mutate(selectedCountry, {
      onSuccess: () => {
        setEditingCountry(false);
        toast({
          title: "Success",
          description: "Your country has been updated.",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update country.",
          variant: "destructive",
        });
      }
    });
  };

  // Handle password change
  const onPasswordSubmit = (data: PasswordChangeFormValues) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    }, {
      onSuccess: () => {
        passwordForm.reset();
        toast({
          title: "Success",
          description: "Your password has been changed.",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to change password.",
          variant: "destructive",
        });
      }
    });
  };

  // Toggle streaming service
  const toggleStreamingService = (service: string) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  return (
    <div className="bg-white min-h-screen pt-6 pb-12">
      <div className="container mx-auto px-6 md:px-8 max-w-4xl">
        <div className="mb-8 px-2">
          <h1 className="text-3xl font-bold mb-2">My Profile</h1>
          <p className="text-slate-500">
            Manage your account and customize your movie recommendations
          </p>
        </div>

        {/* User Info Card */}
        <Card className="p-6 mb-6 shadow-lg border border-blue-50">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{user.name}</h2>
              <p className="text-gray-500">@{user.username}</p>
              <p className="text-gray-500 mt-1">{user.email}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                CineMatch User
              </div>
            </div>
          </div>
        </Card>

        {/* Streaming Services Card */}
        <Card className="p-6 mb-6 shadow-lg border border-blue-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">My Streaming Services</h2>
            {!editingStreamingServices ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEditingStreamingServices(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingStreamingServices(false);
                    setSelectedServices(user.streamingServices || []);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleStreamingServicesUpdate}
                  disabled={updateStreamingMutation.isPending}
                >
                  {updateStreamingMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>

          {!editingStreamingServices ? (
            <div className="flex flex-wrap gap-2">
              {user.streamingServices && user.streamingServices.length > 0 ? (
                user.streamingServices.map((service: string) => (
                  <Badge key={service} variant="outline" className="text-primary">
                    {service}
                  </Badge>
                ))
              ) : (
                <p className="text-gray-500 italic">No streaming services selected</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {streamingServices.map((service) => (
                <div 
                  key={service}
                  className={`cursor-pointer p-2 border rounded-md flex items-center space-x-2 ${
                    selectedServices.includes(service) ? "border-primary bg-primary/5" : "border-gray-200 hover:bg-gray-50"
                  }`}
                  onClick={() => toggleStreamingService(service)}
                >
                  {selectedServices.includes(service) ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <div className="h-4 w-4 border border-gray-300 rounded-sm" />
                  )}
                  <span className={selectedServices.includes(service) ? "text-primary" : ""}>
                    {service}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="text-sm text-gray-500 mt-4">
            These services will be used to suggest films that might be available on your preferred platforms.
          </div>
        </Card>

        {/* Country Card */}
        <Card className="p-6 mb-6 shadow-lg border border-blue-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">My Country</h2>
            {!editingCountry ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEditingCountry(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingCountry(false);
                    setSelectedCountry(user.country || "");
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCountryUpdate}
                  disabled={updateCountryMutation.isPending}
                >
                  {updateCountryMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>

          {!editingCountry ? (
            <div>
              {user.country ? (
                <Badge variant="outline" className="text-primary">
                  {user.country}
                </Badge>
              ) : (
                <p className="text-gray-500 italic">No country selected</p>
              )}
            </div>
          ) : (
            <Select
              value={selectedCountry}
              onValueChange={setSelectedCountry}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="text-sm text-gray-500 mt-4">
            Your country helps us provide more relevant recommendations based on content availability in your region.
          </div>
        </Card>

        {/* Change Password */}
        <Card className="p-6 shadow-lg border border-blue-50">
          <h2 className="text-xl font-semibold mb-4">Change Password</h2>

          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="mt-2 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Change Password
              </Button>
            </form>
          </Form>
        </Card>
        
        {/* Developer Tools - Only shown in development */}
        {import.meta.env.MODE !== 'production' && (
          <Card className="p-6 mt-6 shadow-lg border border-blue-50 bg-amber-50/30">
            <h2 className="text-xl font-semibold mb-4">Developer Tools</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Onboarding Flow Testing</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Reset your onboarding status to test the onboarding flow. This is only available in development mode.
                </p>
                <Button 
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/onboarding/reset-status', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                          'Content-Type': 'application/json'
                        }
                      });
                      
                      if (response.ok) {
                        toast({
                          title: "Onboarding reset successful",
                          description: "Refresh the page to start the onboarding flow",
                        });
                        // Invalidate user data
                        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
                      } else {
                        throw new Error("Failed to reset onboarding status");
                      }
                    } catch (error) {
                      console.error("Error resetting onboarding:", error);
                      toast({
                        title: "Reset failed",
                        description: "Could not reset onboarding status",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  Reset Onboarding Status
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}