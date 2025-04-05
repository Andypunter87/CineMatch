import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth, loginSchema, registerSchema } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, User, Lock, Globe, Tv } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  
  // Login form
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      name: "",
      password: "",
      confirmPassword: "",
      streamingServices: [],
      country: "",
    },
  });

  const onLoginSubmit = (data: any) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: any) => {
    registerMutation.mutate(data);
  };

  // Redirect if user is already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Forms */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
              CineMatch
            </CardTitle>
            <CardDescription>
              {activeTab === "login" 
                ? "Sign in to get personalized movie recommendations"
                : "Create an account for tailored movie recommendations"}
            </CardDescription>
          </CardHeader>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login">
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                              <Input className="pl-10" placeholder="Enter your username" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                              <Input className="pl-10" type="password" placeholder="Enter your password" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Sign In
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </TabsContent>
            
            {/* Register Form */}
            <TabsContent value="register">
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                              <Input className="pl-10" placeholder="Choose a username" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                              <Input className="pl-10" type="email" placeholder="Enter your email" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                              <Input className="pl-10" type="password" placeholder="Create a password" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                              <Input className="pl-10" type="password" placeholder="Confirm your password" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <div className="relative">
                            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 z-10" />
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="pl-10">
                                  <SelectValue placeholder="Select your country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="us">United States</SelectItem>
                                <SelectItem value="ca">Canada</SelectItem>
                                <SelectItem value="uk">United Kingdom</SelectItem>
                                <SelectItem value="au">Australia</SelectItem>
                                <SelectItem value="fr">France</SelectItem>
                                <SelectItem value="de">Germany</SelectItem>
                                <SelectItem value="jp">Japan</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="streamingServices"
                      render={() => (
                        <FormItem>
                          <div className="mb-2">
                            <FormLabel className="text-base">Streaming Services</FormLabel>
                            <div className="flex items-center mb-1">
                              <Tv className="h-4 w-4 text-slate-500 mr-2" />
                              <p className="text-sm text-slate-500">
                                Select the streaming services you use
                              </p>
                            </div>
                          </div>
                          
                          {['netflix', 'hulu', 'disney', 'amazon', 'hbo', 'apple', 'paramount'].map((service) => (
                            <FormField
                              key={service}
                              control={registerForm.control}
                              name="streamingServices"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={service}
                                    className="flex flex-row items-start space-x-3 space-y-0 mb-1"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(service)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, service])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== service
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal capitalize">
                                      {service === 'hbo' ? 'HBO Max' : 
                                       service === 'disney' ? 'Disney+' :
                                       service === 'amazon' ? 'Amazon Prime' :
                                       service === 'apple' ? 'Apple TV+' :
                                       service === 'paramount' ? 'Paramount+' :
                                       service}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                          
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Create Account
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </TabsContent>
          </Tabs>
          
          <CardFooter className="flex flex-col items-center justify-center pt-4">
            <p className="text-sm text-slate-500 mt-4">
              {activeTab === "login" 
                ? "Don't have an account?" 
                : "Already have an account?"}
              <Button 
                variant="link" 
                className="p-0 pl-1 text-blue-500" 
                onClick={() => setActiveTab(activeTab === "login" ? "register" : "login")}
              >
                {activeTab === "login" ? "Sign up" : "Sign in"}
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
      
      {/* Right side - Hero section */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-b from-blue-400 to-cyan-500 flex-col justify-center items-center p-8 text-white">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold mb-4">Find Your Perfect Movie Match</h1>
          <p className="text-xl mb-6">
            CineMatch uses advanced AI to recommend movies based on your mood, time availability, and preferences.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-white/20 rounded-full p-2 mr-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Personalized Recommendations</h3>
                <p className="text-white/80">Movies that match your unique preferences</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white/20 rounded-full p-2 mr-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Discover Hidden Gems</h3>
                <p className="text-white/80">Find amazing indie and foreign films</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white/20 rounded-full p-2 mr-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Connect Your Streaming Services</h3>
                <p className="text-white/80">Filter recommendations by what you can watch now</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}