import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Filter, Users, Eye, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface DispatcherUser {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  ethnicity: string | null;
  religion: string | null;
  selfie_photo_url: string | null;
  ktp_url: string | null;
  role_name: string | null;
}

const DispatcherPage = () => {
  const [users, setUsers] = useState<DispatcherUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<DispatcherUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [ethnicityFilter, setEthnicityFilter] = useState("");
  const [religionFilter, setReligionFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<DispatcherUser | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<DispatcherUser>>({});
  const { toast } = useToast();
  const { userRole, user, loading: authLoading } = useAuth();

  // Derive auth state from useAuth hook
  const isAuthenticated = !!user;
  const isSessionReady = !authLoading;

  // Add ref to prevent duplicate fetches and track initialization
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const isInitialized = useRef(false);

  // Helper function to get image URL from Supabase Storage
  const getImageUrl = (
    path: string | null | undefined,
    bucket: string = "selfies",
  ): string | null => {
    if (!path) return null;

    try {
      // If the path is already a full URL, return it directly
      if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
      }

      // Clean the path - remove any leading slashes or bucket names
      let cleanPath = path.trim();
      if (cleanPath.startsWith("/")) {
        cleanPath = cleanPath.substring(1);
      }
      if (cleanPath.startsWith(`${bucket}/`)) {
        cleanPath = cleanPath.substring(`${bucket}/`.length);
      }

      // Generate public URL from Supabase Storage
      const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
      return data.publicUrl;
    } catch (error) {
     // console.error(`Error getting image URL for ${path}:`, error);
      return null;
    }
  };

  // FIXED: Single useEffect to handle all initialization logic with caching
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) {
      console.log('[DispatcherPage] Already initialized, skipping...');
      return;
    }

    if (isAuthenticated && isSessionReady) {
      console.log('[DispatcherPage] Auth ready, initializing component...');
      isInitialized.current = true;
      
      // Check for cached data first (sessionStorage then localStorage)
      let cachedData = sessionStorage.getItem('dispatcherPage_cachedUsers');
      if (!cachedData) {
        cachedData = localStorage.getItem('dispatcherPage_cachedUsers');
        console.log('[DispatcherPage] No sessionStorage, trying localStorage...');
      }
      
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (parsedData && Array.isArray(parsedData)) { // Allow empty arrays
            setUsers(parsedData);
            setFilteredUsers(parsedData);
            console.log('[DispatcherPage] Loaded cached data, NO LOADING SCREEN');
            
            // Background refresh to get latest data
            setTimeout(() => fetchUsers(true), 100);
            return;
          }
        } catch (error) {
          console.warn('[DispatcherPage] Failed to parse cached data:', error);
        }
      }

      // Fetch data if no cache or cache is empty
      console.log('[DispatcherPage] No cached data, fetching fresh data...');
      fetchUsers();
    }
  }, [isAuthenticated, isSessionReady]);

  // FIXED: Add visibility change handler to refetch data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated && isSessionReady && !authLoading) {
        const now = Date.now();
        // Only refetch if more than 30 seconds have passed since last fetch
        if (now - lastFetchTime.current > 30000 && !fetchInProgress.current) {
          console.log('[DispatcherPage] Tab became visible, doing background refresh...');
          fetchUsers(true); // Background refresh without loading spinner
        } else {
          console.log('[DispatcherPage] Skipping refresh - too recent or already fetching');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, isSessionReady, authLoading]);

  // FIXED: Modified fetchUsers with better error handling and fallback
  const fetchUsers = async (isBackgroundRefresh = false) => {
    // Don't fetch if not authenticated or already fetching
    if (!isAuthenticated || !isSessionReady || authLoading) {
      console.log('[DispatcherPage] Skipping fetch - auth not ready');
      return;
    }

    // Prevent duplicate fetches with more robust checking
    if (fetchInProgress.current) {
      console.log('[DispatcherPage] Fetch already in progress, skipping...');
      return;
    }

    // Additional check: don't fetch if we just fetched recently (less than 5 seconds ago)
    const now = Date.now();
    if (now - lastFetchTime.current < 5000 && users.length > 0) {
      console.log('[DispatcherPage] Recent fetch detected, skipping...');
      return;
    }

    fetchInProgress.current = true;

    try {
      // Only show loading spinner for initial load when no data exists
      if (!isBackgroundRefresh && users.length === 0) {
        console.log('[DispatcherPage] Showing loading spinner for initial load');
        setIsLoading(true);
      } else {
        console.log('[DispatcherPage] Background refresh, no loading spinner');
      }

      setIsFetching(true);

      // FIXED: Fetch only Dispatcher users with role_id = 8 and role_name = "Dispatcher"
      console.log('[DispatcherPage] Fetching users with Dispatcher role only...');
      
      // First, let's check what roles exist and find the correct Dispatcher role
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("*");
        
      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      } else {
        console.log("Available roles:", rolesData);
      }

      // FIXED: Fetch only users with role_id = 8 (Dispatcher role)
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(`
          id,
          full_name,
          email,
          phone_number,
          ethnicity,
          religion,
          selfie_photo_url,
          ktp_url,
          role_id,
          roles (
            id,
            role_name
          )
        `)
        .eq("role_id", 8); // Only fetch users with role_id = 8

      console.log('[DispatcherPage] Users with role_id=8 fetched:', usersData?.length || 0);
      console.log('[DispatcherPage] Sample user data:', usersData?.[0]);

      if (usersError) {
        throw usersError;
      }

      if (usersData) {
        // Transform and filter to ensure only Dispatcher role users
        const transformedUsers = (usersData || [])
          .map((user) => ({
            ...user,
            role_name: user.roles?.role_name || null,
          }))
          .filter((user) => {
            // Double check: only include users with role_id = 8 AND role_name contains "Dispatcher"
            const isDispatcher = user.role_id === 8 && 
              (user.role_name?.toLowerCase().includes('dispatcher') || 
               user.role_name?.toLowerCase() === 'dispatcher');
            
            if (!isDispatcher) {
              console.log('[DispatcherPage] Filtering out non-dispatcher user:', user.full_name, 'Role:', user.role_name);
            }
            
            return isDispatcher;
          });

        console.log('[DispatcherPage] Final filtered Dispatcher users:', transformedUsers.length);
        console.log('[DispatcherPage] Dispatcher users sample:', transformedUsers[0]);

        setUsers(transformedUsers);
        setFilteredUsers(transformedUsers);

        // ✅ FIXED: Update lastFetchTime only on successful fetch
        lastFetchTime.current = Date.now();
        
        // ✅ Cache the data in both sessionStorage and localStorage
        try {
          const dataToCache = JSON.stringify(transformedUsers);
          sessionStorage.setItem('dispatcherPage_cachedUsers', dataToCache);
          localStorage.setItem('dispatcherPage_cachedUsers', dataToCache);
          console.log('[DispatcherPage] Data cached successfully in both storages');
        } catch (cacheError) {
          console.warn('[DispatcherPage] Failed to cache data:', cacheError);
        }
        
        console.log('[DispatcherPage] Users fetched successfully:', transformedUsers.length);
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      
      // ✅ FIXED: Add fallback to prevent stuck loading
      if (!isBackgroundRefresh) {
        // Set empty arrays to show "No users found" instead of stuck loading
        setUsers([]);
        setFilteredUsers([]);
      }
      
      toast({
        variant: "destructive",
        title: "Error fetching users",
        description: error?.message || "Failed to fetch user data",
      });
    } finally {
      // CRITICAL: Always reset loading states
      setIsLoading(false);
      setIsFetching(false);
      fetchInProgress.current = false;
    }
  };

  useEffect(() => {
    if (!users.length) {
      setFilteredUsers([]);
      return;
    }

    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.phone_number?.toLowerCase().includes(searchLower)
      );
    }

    // Apply ethnicity filter
    if (ethnicityFilter) {
      const ethnicityLower = ethnicityFilter.toLowerCase();
      filtered = filtered.filter((user) =>
        user.ethnicity?.toLowerCase().includes(ethnicityLower)
      );
    }

    // Apply religion filter
    if (religionFilter) {
      const religionLower = religionFilter.toLowerCase();
      filtered = filtered.filter((user) =>
        user.religion?.toLowerCase().includes(religionLower)
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, ethnicityFilter, religionFilter]);

  const handleView = (user: DispatcherUser) => {
    setSelectedUser(user);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (user: DispatcherUser) => {
    setSelectedUser(user);
    setEditFormData({
      full_name: user.full_name || "",
      email: user.email || "",
      phone_number: user.phone_number || "",
      ethnicity: user.ethnicity || "",
      religion: user.religion || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (user: DispatcherUser) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from("users")
        .update(editFormData)
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setIsEditDialogOpen(false);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    if (userRole !== "Staff") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only Staff can delete dispatchers",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete user",
      });
    }
  };

  return (
    <div className="p-8">
      <Card className="bg-white shadow-md border-0 overflow-hidden rounded-xl">
        <CardHeader className="bg-gradient-to-r from-primary-tosca/10 to-primary-dark/10 pb-4">
          <CardTitle className="text-2xl font-bold text-primary-dark flex items-center gap-2">
            <Users className="h-6 w-6" />
            Dispatcher Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filter Section */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Filter Users</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Input
                placeholder="Filter by ethnicity"
                value={ethnicityFilter}
                onChange={(e) => setEthnicityFilter(e.target.value)}
              />
              <Input
                placeholder="Filter by religion"
                value={religionFilter}
                onChange={(e) => setReligionFilter(e.target.value)}
              />
            </div>
            {(searchTerm || ethnicityFilter || religionFilter) && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                {searchTerm && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => setSearchTerm("")}
                  >
                    Search: {searchTerm} ×
                  </Badge>
                )}
                {ethnicityFilter && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => setEthnicityFilter("")}
                  >
                    Ethnicity: {ethnicityFilter} ×
                  </Badge>
                )}
                {religionFilter && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => setReligionFilter("")}
                  >
                    Religion: {religionFilter} ×
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setEthnicityFilter("");
                    setReligionFilter("");
                  }}
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>

          {/* FIXED: Better loading and empty state handling */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>
                  {filteredUsers.length} of {users.length} users shown
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Ethnicity</TableHead>
                    <TableHead>Religion</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center py-8 text-gray-500"
                      >
                        No users match the current filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={
                                getImageUrl(user.selfie_photo_url, "selfies") ||
                                undefined
                              }
                              alt={user.full_name || "User"}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-gray-200 text-gray-600">
                              {user.full_name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">
                          {user.full_name || "-"}
                        </TableCell>
                        <TableCell>{user.email || "-"}</TableCell>
                        <TableCell>{user.phone_number || "-"}</TableCell>
                        <TableCell>{user.ethnicity || "-"}</TableCell>
                        <TableCell>{user.religion || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.role_name || "No Role"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.selfie_photo_url && (
                              <a
                                href={
                                  getImageUrl(user.selfie_photo_url, "selfies") ||
                                  "#"
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:opacity-80"
                              >
                                <Badge
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover:bg-blue-200 bg-blue-100 text-blue-800"
                                >
                                  Selfie
                                </Badge>
                              </a>
                            )}
                            {user.ktp_url && (
                              <a
                                href={
                                  getImageUrl(user.ktp_url, "documents") || "#"
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:opacity-80"
                              >
                                <Badge
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover:bg-green-200 bg-green-100 text-green-800"
                                >
                                  KTP
                                </Badge>
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {userRole !== "Staff" && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(user)}
                                className="h-8 w-8 p-0 hover:bg-blue-100"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(user)}
                                className="h-8 w-8 p-0 hover:bg-green-100"
                              >
                                <Edit className="h-4 w-4 text-green-600" />
                              </Button>
                              {userRole === "Super Admin" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(user)}
                                  className="h-8 w-8 p-0 hover:bg-red-100"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>View Dispatcher Details</DialogTitle>
            <DialogDescription>
              Detailed information about the dispatcher
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="flex flex-col items-center col-span-2 mb-4">
                <Avatar className="h-20 w-20 mb-2">
                  <AvatarImage
                    src={
                      getImageUrl(selectedUser.selfie_photo_url, "selfies") ||
                      undefined
                    }
                    alt={selectedUser.full_name || "User"}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-lg">
                    {selectedUser.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <Badge variant="outline" className="mt-2">
                  {selectedUser.role_name || "No Role"}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Full Name
                </Label>
                <p className="text-sm mt-1">{selectedUser.full_name || "-"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Email
                </Label>
                <p className="text-sm mt-1">{selectedUser.email || "-"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Phone Number
                </Label>
                <p className="text-sm mt-1">
                  {selectedUser.phone_number || "-"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Ethnicity
                </Label>
                <p className="text-sm mt-1">{selectedUser.ethnicity || "-"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Religion
                </Label>
                <p className="text-sm mt-1">{selectedUser.religion || "-"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  User ID
                </Label>
                <p className="text-sm mt-1 font-mono">{selectedUser.id}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-gray-500">
                  Documents
                </Label>
                <div className="flex gap-2 mt-2">
                  {selectedUser.selfie_photo_url && (
                    <a
                      href={
                        getImageUrl(selectedUser.selfie_photo_url, "selfies") ||
                        "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80"
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-blue-200 bg-blue-100 text-blue-800"
                      >
                        View Selfie
                      </Badge>
                    </a>
                  )}
                  {selectedUser.ktp_url && (
                    <a
                      href={
                        getImageUrl(selectedUser.ktp_url, "documents") || "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80"
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-green-200 bg-green-100 text-green-800"
                      >
                        View KTP
                      </Badge>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Dispatcher</DialogTitle>
            <DialogDescription>Update dispatcher information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={editFormData.full_name || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    full_name: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editFormData.email || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, email: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                value={editFormData.phone_number || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    phone_number: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ethnicity">Ethnicity</Label>
              <Input
                id="ethnicity"
                value={editFormData.ethnicity || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    ethnicity: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="religion">Religion</Label>
              <Input
                id="religion"
                value={editFormData.religion || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, religion: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Dispatcher</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this dispatcher? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={
                      getImageUrl(selectedUser.selfie_photo_url, "selfies") ||
                      undefined
                    }
                    alt={selectedUser.full_name || "User"}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gray-200 text-gray-600">
                    {selectedUser.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedUser.full_name || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedUser.email || "No email"}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DispatcherPage;