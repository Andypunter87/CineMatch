import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { Loader2, Users, Activity, Film, BookmarkCheck, Calendar } from "lucide-react";

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  
  // If user is still loading, show loading indicator
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[500px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  // If user is not admin, redirect to home
  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }
  
  return (
    <Layout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Admin Dashboard</h1>
        <p className="text-muted-foreground mb-6">
          Monitor user activity, recommendation stats, and overall usage of CineMatch.
        </p>
        
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>
          
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
          
          <TabsContent value="recommendations">
            <RecommendationsTab />
          </TabsContent>
          
          <TabsContent value="watchlist">
            <WatchlistTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function OverviewTab() {
  // Fetch overview statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/overview'],
    retry: false,
  });
  
  if (statsLoading) {
    return <LoadingState />;
  }
  
  // Fetch activity timeline data
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['/api/admin/activity'],
    retry: false,
  });
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Users" 
          value={statsData?.userCount || 0} 
          icon={<Users className="h-4 w-4 text-blue-600" />}
          description="Registered accounts" 
        />
        <StatCard 
          title="Recommendations" 
          value={statsData?.recommendationCount || 0} 
          icon={<Film className="h-4 w-4 text-purple-600" />}
          description="Films suggested" 
        />
        <StatCard 
          title="Watchlist Items" 
          value={statsData?.watchlistCount || 0} 
          icon={<BookmarkCheck className="h-4 w-4 text-green-600" />}
          description="Saved films" 
        />
        <StatCard 
          title="Active Today" 
          value={statsData?.activeToday || 0} 
          icon={<Activity className="h-4 w-4 text-red-600" />}
          description="Unique users" 
        />
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={activityData || []}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="logins" 
                  stroke="#3b82f6" 
                  activeDot={{ r: 8 }} 
                  name="Logins"
                />
                <Line 
                  type="monotone" 
                  dataKey="recommendations" 
                  stroke="#8b5cf6" 
                  name="Recommendations"
                />
                <Line 
                  type="monotone" 
                  dataKey="watchlistAdds" 
                  stroke="#22c55e" 
                  name="Watchlist Adds"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">New Users</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-border" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={activityData?.slice(-7) || []}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="newUsers" fill="#3b82f6" name="New Users" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Recommendation Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-border" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Recommendations per User</p>
                    <p className="text-sm text-muted-foreground">Average</p>
                  </div>
                  <div className="text-2xl font-bold">{statsData?.avgRecommendationsPerUser?.toFixed(1) || "0"}</div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Watchlist Ratio</p>
                    <p className="text-sm text-muted-foreground">Saved vs. Recommended</p>
                  </div>
                  <div className="text-2xl font-bold">{statsData?.watchlistSaveRatio?.toFixed(1) || "0"}%</div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Watched Rate</p>
                    <p className="text-sm text-muted-foreground">Of watchlist items</p>
                  </div>
                  <div className="text-2xl font-bold">{statsData?.watchedRate?.toFixed(1) || "0"}%</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UsersTab() {
  // Fetch user statistics
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    retry: false,
  });
  
  if (usersLoading) {
    return <LoadingState />;
  }
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Total Users" 
          value={usersData?.totalUsers || 0} 
          icon={<Users className="h-4 w-4 text-blue-600" />}
          description="Registered accounts" 
        />
        <StatCard 
          title="Active Users" 
          value={usersData?.activeUsers || 0} 
          icon={<Activity className="h-4 w-4 text-green-600" />}
          description="Last 30 days" 
        />
        <StatCard 
          title="New Users" 
          value={usersData?.newUsers || 0} 
          icon={<Calendar className="h-4 w-4 text-purple-600" />}
          description="Last 7 days" 
        />
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-medium">User Growth</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={usersData?.userGrowth || []}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalUsers" 
                  stroke="#3b82f6" 
                  name="Total Users"
                />
                <Line 
                  type="monotone" 
                  dataKey="newUsers" 
                  stroke="#8b5cf6" 
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">User Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Logins by Time of Day</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={usersData?.loginsByTime || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" name="Logins" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium mb-3">Top Countries</h4>
                  <div className="space-y-2">
                    {(usersData?.topCountries || []).map((country, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{country.name}</span>
                        <span className="text-sm font-medium">{country.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-3">Popular Streaming Services</h4>
                  <div className="space-y-2">
                    {(usersData?.popularServices || []).map((service, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{service.name}</span>
                        <span className="text-sm font-medium">{service.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RecommendationsTab() {
  // Fetch recommendation statistics
  const { data: recsData, isLoading: recsLoading } = useQuery({
    queryKey: ['/api/admin/recommendations'],
    retry: false,
  });
  
  if (recsLoading) {
    return <LoadingState />;
  }
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Total Recommendations" 
          value={recsData?.totalRecommendations || 0} 
          icon={<Film className="h-4 w-4 text-purple-600" />}
          description="Films suggested" 
        />
        <StatCard 
          title="Unique Films" 
          value={recsData?.uniqueFilms || 0} 
          icon={<Film className="h-4 w-4 text-blue-600" />}
          description="Different titles" 
        />
        <StatCard 
          title="Daily Average" 
          value={recsData?.dailyAverage || 0} 
          icon={<Activity className="h-4 w-4 text-green-600" />}
          description="Recommendations/day" 
        />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Popular Moods</CardTitle>
          </CardHeader>
          <CardContent>
            {recsLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-border" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={recsData?.popularMoods || []}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" name="Requests" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Popular Locations</CardTitle>
          </CardHeader>
          <CardContent>
            {recsLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-border" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={recsData?.popularLocations || []}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Requests" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recommendation Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {recsLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={recsData?.recommendationTrends || []}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="mainstream" 
                  stroke="#3b82f6" 
                  name="Mainstream Films"
                />
                <Line 
                  type="monotone" 
                  dataKey="indie" 
                  stroke="#8b5cf6" 
                  name="Indie Films"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WatchlistTab() {
  // Fetch watchlist statistics
  const { data: watchlistData, isLoading: watchlistLoading } = useQuery({
    queryKey: ['/api/admin/watchlist'],
    retry: false,
  });
  
  if (watchlistLoading) {
    return <LoadingState />;
  }
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Items" 
          value={watchlistData?.totalItems || 0} 
          icon={<BookmarkCheck className="h-4 w-4 text-blue-600" />}
          description="Saved films" 
        />
        <StatCard 
          title="Watched Items" 
          value={watchlistData?.watchedItems || 0} 
          icon={<Film className="h-4 w-4 text-green-600" />}
          description="Completed films" 
        />
        <StatCard 
          title="Save Rate" 
          value={`${watchlistData?.saveRate || 0}%`} 
          icon={<Activity className="h-4 w-4 text-purple-600" />}
          description="Of recommendations" 
        />
        <StatCard 
          title="Completion Rate" 
          value={`${watchlistData?.completionRate || 0}%`} 
          icon={<Activity className="h-4 w-4 text-red-600" />}
          description="Of saved films" 
        />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Popular Genres</CardTitle>
        </CardHeader>
        <CardContent>
          {watchlistLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={watchlistData?.popularGenres || []}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="saved" fill="#3b82f6" name="Saved" />
                <Bar dataKey="watched" fill="#22c55e" name="Watched" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Top Saved Films</CardTitle>
          </CardHeader>
          <CardContent>
            {watchlistLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-border" />
              </div>
            ) : (
              <div className="space-y-4">
                {(watchlistData?.topSavedFilms || []).map((film, index) => (
                  <div key={index} className="flex items-start">
                    <div className="text-sm font-medium mr-2">{index + 1}.</div>
                    <div>
                      <div className="text-sm font-medium">{film.title} ({film.year})</div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <span className="mr-2">Saved: {film.count}</span>
                        <span>Watched: {film.watched}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Highest Rated Films</CardTitle>
          </CardHeader>
          <CardContent>
            {watchlistLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-border" />
              </div>
            ) : (
              <div className="space-y-4">
                {(watchlistData?.topRatedFilms || []).map((film, index) => (
                  <div key={index} className="flex items-start">
                    <div className="text-sm font-medium mr-2">{index + 1}.</div>
                    <div>
                      <div className="text-sm font-medium">{film.title} ({film.year})</div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <span className="mr-2">Rating: {film.rating}/5</span>
                        <span>Ratings: {film.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, description }: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground pt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
        <p className="text-muted-foreground">Loading analytics data...</p>
      </div>
    </div>
  );
}