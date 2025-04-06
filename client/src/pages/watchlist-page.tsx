import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BookmarkCheck, Star, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

// Define WatchlistItem type
type WatchlistItem = {
  id: number;
  userId: number;
  filmId: number;
  filmTitle: string;
  filmYear?: number;
  filmDirector?: string;
  filmType?: string;
  filmGenres?: string[];
  filmPosterUrl?: string;
  recommendationContext?: any;
  dateAdded: string;
  watched: boolean;
  dateWatched?: string;
  userRating?: number;
  userNotes?: string;
};

// Star rating component
const StarRating = ({ 
  value, 
  onChange, 
  readOnly = false 
}: { 
  value: number; 
  onChange?: (rating: number) => void;
  readOnly?: boolean;
}) => {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-5 w-5 ${
            star <= value
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          } ${!readOnly ? "cursor-pointer" : ""}`}
          onClick={() => !readOnly && onChange && onChange(star)}
        />
      ))}
    </div>
  );
};

export default function WatchlistPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"all" | "watched" | "unwatched">("all");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  // Fetch watchlist
  const {
    data: watchlistItems,
    isLoading,
    error,
  } = useQuery<WatchlistItem[]>({
    queryKey: ["/api/watchlist"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Update watchlist item mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: number;
      updates: { watched?: boolean; userRating?: number; userNotes?: string };
    }) => {
      const res = await apiRequest("PUT", `/api/watchlist/${id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Success",
        description: "Watchlist item updated",
      });
      setEditingItemId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete watchlist item mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/watchlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Success",
        description: "Item removed from watchlist",
      });
      setItemToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Filter items based on active tab
  const filteredItems = watchlistItems
    ? watchlistItems.filter((item) => {
        if (activeTab === "all") return true;
        if (activeTab === "watched") return item.watched;
        if (activeTab === "unwatched") return !item.watched;
        return true;
      })
    : [];

  // Handler for toggling watched status
  const toggleWatched = (id: number, currentStatus: boolean) => {
    // If toggling to watched, prompt for rating
    if (!currentStatus) {
      // Get the item to pre-fill dialog
      const item = watchlistItems?.find(item => item.id === id);
      if (item) {
        setEditingItemId(item.id);
        setRating(0); // Start with no rating
        setNotes(item.userNotes || "");
        // Update to watched status is handled in the rating dialog
      }
    } else {
      // If toggling to unwatched, just update directly
      updateMutation.mutate({
        id,
        updates: { watched: false },
      });
    }
  };

  // Handler for opening the rating/notes dialog
  const openEditDialog = (item: WatchlistItem) => {
    setEditingItemId(item.id);
    setRating(item.userRating || 0);
    setNotes(item.userNotes || "");
  };

  // Handler for saving rating/notes
  const saveRatingAndNotes = () => {
    if (editingItemId) {
      // Find the current item to check its watched status
      const currentItem = watchlistItems?.find(item => item.id === editingItemId);
      const wasAlreadyWatched = currentItem?.watched;
      
      updateMutation.mutate({
        id: editingItemId,
        updates: {
          // Always mark as watched when saving from the rating dialog
          watched: true,
          userRating: rating || undefined,
          userNotes: notes.trim() || undefined,
        },
      });
    }
  };

  // Handler for confirming deletion
  const confirmDelete = (id: number) => {
    setItemToDelete(id);
  };

  // Handler for actually deleting the item
  const handleDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete);
    }
  };

  // Watchlist grid component
  function WatchlistGrid({
    items,
    toggleWatched,
    openEditDialog,
    confirmDelete,
    updatePending
  }: {
    items: WatchlistItem[];
    toggleWatched: (id: number, watched: boolean) => void;
    openEditDialog: (item: WatchlistItem) => void;
    confirmDelete: (id: number) => void;
    updatePending: boolean;
  }) {
    if (items.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-slate-500">No films in this category</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <Card 
            key={item.id} 
            className="flex flex-col overflow-hidden h-full shadow-blue-100/50 shadow-lg border border-blue-50"
          >
            {item.filmPosterUrl && (
              <div className="relative aspect-video w-full overflow-hidden">
                <img
                  src={item.filmPosterUrl}
                  alt={item.filmTitle}
                  className="object-cover w-full h-full"
                />
                <div className="absolute top-2 right-2">
                  {item.watched && (
                    <Badge 
                      variant="default"
                      className="bg-green-500"
                    >
                      Watched
                    </Badge>
                  )}
                </div>
              </div>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start justify-between gap-2">
                <span className="text-lg">{item.filmTitle}</span>
                {item.filmYear && <span className="text-sm text-slate-500">{item.filmYear}</span>}
              </CardTitle>
              <CardDescription>
                {item.filmDirector && <span>Directed by {item.filmDirector}</span>}
                {item.userRating && item.userRating > 0 && (
                  <div className="mt-1">
                    <StarRating value={item.userRating} readOnly />
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4 flex-grow">
              {item.filmGenres && item.filmGenres.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.filmGenres.map((genre: string) => (
                    <Badge key={genre} variant="outline" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}
              {item.userNotes && (
                <div className="mt-2 text-sm text-slate-600 border-l-2 border-blue-200 pl-3 py-1 italic">
                  "{item.userNotes}"
                </div>
              )}
            </CardContent>
            <div className="p-3 sm:p-4 pt-0 mt-auto border-t border-slate-100 flex flex-col sm:flex-row sm:justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleWatched(item.id, !!item.watched)}
                disabled={updatePending}
                className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
              >
                {updatePending ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                ) : item.watched ? (
                  <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                ) : (
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                )}
                {item.watched ? "Unwatch" : "Mark as Watched"}
              </Button>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(item)}
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                >
                  <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => confirmDelete(item.id)}
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen py-8">
        <div className="container mx-auto px-6 md:px-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white min-h-screen py-8">
        <div className="container mx-auto px-6 md:px-8">
          <Card className="border-red-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-red-500">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Failed to load your watchlist. Please try again later.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pt-6 pb-12">
      <div className="container mx-auto px-6 md:px-8">
        <div className="mb-8 px-2">
          <h1 className="text-3xl font-bold mb-2">Your Watchlist</h1>
          <p className="text-slate-500">
            Track films you want to watch and rate those you've seen
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-6 w-full">
            <TabsTrigger className="text-xs sm:text-sm flex-1" value="all">All Films</TabsTrigger>
            <TabsTrigger className="text-xs sm:text-sm flex-1" value="unwatched">To Watch</TabsTrigger>
            <TabsTrigger className="text-xs sm:text-sm flex-1" value="watched">Watched</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <WatchlistGrid
              items={filteredItems}
              toggleWatched={toggleWatched}
              openEditDialog={openEditDialog}
              confirmDelete={confirmDelete}
              updatePending={updateMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="unwatched" className="mt-0">
            <WatchlistGrid
              items={filteredItems.filter(item => !item.watched)}
              toggleWatched={toggleWatched}
              openEditDialog={openEditDialog}
              confirmDelete={confirmDelete}
              updatePending={updateMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="watched" className="mt-0">
            <WatchlistGrid
              items={filteredItems.filter(item => item.watched)}
              toggleWatched={toggleWatched}
              openEditDialog={openEditDialog}
              confirmDelete={confirmDelete}
              updatePending={updateMutation.isPending}
            />
          </TabsContent>
        </Tabs>

        {/* Edit Dialog for Rating and Notes */}
        {editingItemId && (
          <Dialog
            open={!!editingItemId}
            onOpenChange={(open) => !open && setEditingItemId(null)}
          >
            <DialogContent className="bg-white text-gray-800 shadow-xl shadow-blue-100/50">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Mark as Watched & Rate</DialogTitle>
                <DialogDescription className="text-gray-600">
                  This film will be marked as watched. Add a rating and your thoughts about it.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-800 mb-2 block">Rating</label>
                  <StarRating value={rating} onChange={setRating} />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-800 mb-2 block">Notes</label>
                  <Textarea
                    placeholder="Write your thoughts about this film..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="bg-white text-gray-800 placeholder:text-gray-400 border-gray-200"
                  />
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={saveRatingAndNotes} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!itemToDelete}
          onOpenChange={(open) => !open && setItemToDelete(null)}
        >
          <DialogContent className="bg-white text-gray-800 shadow-xl shadow-blue-100/50">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Confirm Removal</DialogTitle>
              <DialogDescription className="text-gray-600">
                Are you sure you want to remove this film from your watchlist?
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {watchlistItems?.length === 0 && (
          <div className="text-center py-12">
            <BookmarkCheck className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">Your watchlist is empty</h3>
            <p className="text-slate-500 mb-4">
              When you find movies you want to watch later, save them here
            </p>
            <Link href="/">
              <Button 
                className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500"
              >
                Find Movies to Watch
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}