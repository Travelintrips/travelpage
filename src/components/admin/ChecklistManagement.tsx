import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ChecklistItem {
  id: number;
  item_name: string;
  damage_value: number;
  category: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const ChecklistManagement = () => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState<Partial<ChecklistItem>>({
    item_name: "",
    damage_value: 0,
    category: "",
    description: "",
  });
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const { toast } = useToast();

  // Fetch checklist items
  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("checklist_items")
        .select("*")
        .order("category", { ascending: true })
        .order("item_name", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching checklist items",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Add new item
  const handleAddItem = async () => {
    try {
      if (!newItem.item_name) {
        toast({
          title: "Validation Error",
          description: "Item name is required",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("checklist_items")
        .insert([
          {
            item_name: newItem.item_name,
            damage_value: newItem.damage_value || 0,
            category: newItem.category || null,
            description: newItem.description || null,
          },
        ])
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Checklist item added successfully",
      });

      setNewItem({
        item_name: "",
        damage_value: 0,
        category: "",
        description: "",
      });
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Error adding checklist item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Delete item
  const handleDeleteItem = async (id: number) => {
    try {
      const { error } = await supabase
        .from("checklist_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Checklist item deleted successfully",
      });

      fetchItems();
    } catch (error: any) {
      toast({
        title: "Error deleting checklist item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Start editing item
  const startEdit = (item: ChecklistItem) => {
    setEditingItem({ ...item });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingItem(null);
  };

  // Save edited item
  const saveEdit = async () => {
    try {
      if (!editingItem) return;

      if (!editingItem.item_name) {
        toast({
          title: "Validation Error",
          description: "Item name is required",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("checklist_items")
        .update({
          item_name: editingItem.item_name,
          damage_value: editingItem.damage_value,
          category: editingItem.category,
          description: editingItem.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Checklist item updated successfully",
      });

      setEditingItem(null);
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Error updating checklist item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Checklist Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Input
                placeholder="Item Name"
                value={newItem.item_name}
                onChange={(e) =>
                  setNewItem({ ...newItem, item_name: e.target.value })
                }
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Damage Value"
                value={newItem.damage_value || ""}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    damage_value: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Input
                placeholder="Category"
                value={newItem.category || ""}
                onChange={(e) =>
                  setNewItem({ ...newItem, category: e.target.value })
                }
              />
            </div>
            <div>
              <Button
                onClick={handleAddItem}
                className="w-full bg-gradient-to-r from-primary-tosca to-primary-dark hover:from-primary-dark hover:to-primary-tosca text-white"
                type="button"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Damage Value</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      No checklist items found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {editingItem?.id === item.id ? (
                          <Input
                            value={editingItem.item_name}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                item_name: e.target.value,
                              })
                            }
                          />
                        ) : (
                          item.item_name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingItem?.id === item.id ? (
                          <Input
                            type="number"
                            value={editingItem.damage_value}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                damage_value: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        ) : (
                          `Rp ${item.damage_value.toLocaleString()}`
                        )}
                      </TableCell>
                      <TableCell>
                        {editingItem?.id === item.id ? (
                          <Input
                            value={editingItem.category || ""}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                category: e.target.value,
                              })
                            }
                          />
                        ) : (
                          item.category || "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {editingItem?.id === item.id ? (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={saveEdit}
                              type="button"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              type="button"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(item)}
                              type="button"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteItem(item.id)}
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChecklistManagement;
