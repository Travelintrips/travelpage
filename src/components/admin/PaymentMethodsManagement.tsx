import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  AlertCircle,
} from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  type: "manual" | "gateway";
  provider: string | null;
  api_key: string | null;
  merchant_id: string | null;
  public_key: string | null;
  private_key: string | null;
  is_active: boolean;
  created_at: string;
  bank_name: string | null;
  account_holder: string | null;
  account_number: string | null;
  bank_code: string | null;
  swift_code: string | null;
  branch: string | null;
}

const PaymentMethodsManagement = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMethod, setCurrentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    type: "manual",
    provider: "",
    api_key: "",
    merchant_id: "",
    public_key: "",
    private_key: "",
    is_active: true,
    bank_name: "",
    account_holder: "",
    account_number: "",
    bank_code: "",
    swift_code: "",
    branch: "",
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("type", "manual")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPaymentMethods(data || []);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (method: PaymentMethod | null = null) => {
    if (method) {
      setCurrentMethod(method);
      setFormData({
        name: method.name,
        type: method.type,
        provider: method.provider || "",
        api_key: method.api_key || "",
        merchant_id: method.merchant_id || "",
        public_key: method.public_key || "",
        private_key: method.private_key || "",
        is_active: method.is_active,
        bank_name: method.bank_name || "",
        account_holder: method.account_holder || "",
        account_number: method.account_number || "",
        bank_code: method.bank_code || "",
        swift_code: method.swift_code || "",
        branch: method.branch || "",
      });
    } else {
      setCurrentMethod(null);
      setFormData({
        name: "",
        type: "manual",
        provider: "",
        api_key: "",
        merchant_id: "",
        public_key: "",
        private_key: "",
        is_active: true,
        bank_name: "",
        account_holder: "",
        account_number: "",
        bank_code: "",
        swift_code: "",
        branch: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData({ ...formData, is_active: checked });
  };

  const handleSubmit = async () => {
    try {
      if (currentMethod) {
        // Update existing payment method
        const { error } = await supabase
          .from("payment_methods")
          .update({
            name: formData.name,
            type: formData.type as "manual" | "gateway",
            provider: formData.type === "gateway" ? formData.provider : null,
            api_key: formData.type === "gateway" ? formData.api_key : null,
            merchant_id:
              formData.type === "gateway" ? formData.merchant_id : null,
            public_key:
              formData.type === "gateway" ? formData.public_key : null,
            private_key:
              formData.type === "gateway" ? formData.private_key : null,
            is_active: formData.is_active,
            bank_name: formData.type === "manual" ? formData.bank_name : null,
            account_holder:
              formData.type === "manual" ? formData.account_holder : null,
            account_number:
              formData.type === "manual" ? formData.account_number : null,
            bank_code: formData.type === "manual" ? formData.bank_code : null,
            swift_code: formData.type === "manual" ? formData.swift_code : null,
            branch: formData.type === "manual" ? formData.branch : null,
          })
          .eq("id", currentMethod.id);

        if (error) throw error;
      } else {
        // Create new payment method
        const { error } = await supabase.from("payment_methods").insert([
          {
            name: formData.name,
            type: formData.type,
            provider: formData.type === "gateway" ? formData.provider : null,
            api_key: formData.type === "gateway" ? formData.api_key : null,
            merchant_id:
              formData.type === "gateway" ? formData.merchant_id : null,
            public_key:
              formData.type === "gateway" ? formData.public_key : null,
            private_key:
              formData.type === "gateway" ? formData.private_key : null,
            is_active: formData.is_active,
            bank_name: formData.type === "manual" ? formData.bank_name : null,
            account_holder:
              formData.type === "manual" ? formData.account_holder : null,
            account_number:
              formData.type === "manual" ? formData.account_number : null,
            bank_code: formData.type === "manual" ? formData.bank_code : null,
            swift_code: formData.type === "manual" ? formData.swift_code : null,
            branch: formData.type === "manual" ? formData.branch : null,
          },
        ]);

        if (error) throw error;
      }

      // Refresh the list
      fetchPaymentMethods();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving payment method:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Refresh the list
      fetchPaymentMethods();
    } catch (error) {
      console.error("Error deleting payment method:", error);
    }
  };

  const getPaymentMethodIcon = (type: string) => {
    return type === "manual" ? (
      <Wallet className="h-5 w-5 text-muted-foreground" />
    ) : (
      <CreditCard className="h-5 w-5 text-muted-foreground" />
    );
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">
              Payment Methods
            </CardTitle>
            <CardDescription>
              Manage payment methods for your application
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> Add Payment Method
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No payment methods found</h3>
              <p className="text-muted-foreground mt-2">
                Add your first payment method to get started
              </p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Add Payment Method
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Title</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Bank Name</th>
                    <th className="text-left py-3 px-4">Account Holder</th>
                    <th className="text-left py-3 px-4">Account Number</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentMethods.map((method) => (
                    <tr key={method.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {getPaymentMethodIcon(method.type)}
                          <span className="ml-2">{method.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize">{method.type}</span>
                      </td>
                      <td className="py-3 px-4">{method.bank_name || "-"}</td>
                      <td className="py-3 px-4">
                        {method.account_holder || "-"}
                      </td>
                      <td className="py-3 px-4">
                        {method.account_number || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${method.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {method.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(method)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Payment Method
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this payment
                                  method? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(method.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {currentMethod ? "Edit Payment Method" : "Add Payment Method"}
            </DialogTitle>
            <DialogDescription>
              {currentMethod
                ? "Update the details of this payment method"
                : "Fill in the details to add a new payment method"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Title</Label>
              <Input
                id="name"
                name="name"
                placeholder="Credit Card, Cash, Bank Transfer, etc."
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleSelectChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="gateway">Payment Gateway</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.type === "gateway" ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Input
                    id="provider"
                    name="provider"
                    placeholder="Paylabs, Midtrans, Xendit, etc."
                    value={formData.provider}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="merchant_id">
                    Merchant ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="merchant_id"
                    name="merchant_id"
                    placeholder="Enter your custom gateway merchant ID"
                    value={formData.merchant_id}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="public_key">
                    Public Key <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="public_key"
                    name="public_key"
                    placeholder="Enter your custom gateway Public Key"
                    value={formData.public_key}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="private_key">
                    Private Key <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="private_key"
                    name="private_key"
                    type="password"
                    placeholder="Enter your custom gateway Private Key"
                    value={formData.private_key}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    Use these constants to access the values entered in these
                    fields in your custom gateway implementation:
                    <br />
                    <strong>P_G_MERCHANT_ID</strong>, <strong>P_G_PK</strong>,{" "}
                    <strong>P_G_SK</strong> and <strong>P_G_SALT_K</strong>.
                    Learn more in the Droptaxi documentation.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    name="bank_name"
                    placeholder="Enter bank name"
                    value={formData.bank_name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="account_holder">Account Holder</Label>
                  <Input
                    id="account_holder"
                    name="account_holder"
                    placeholder="Enter account holder name"
                    value={formData.account_holder}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="account_number">Account Number</Label>
                  <Input
                    id="account_number"
                    name="account_number"
                    placeholder="Enter account number"
                    value={formData.account_number}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bank_code">Bank Code</Label>
                  <Input
                    id="bank_code"
                    name="bank_code"
                    placeholder="Enter bank code"
                    value={formData.bank_code}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="swift_code">Swift/BIC Code</Label>
                  <Input
                    id="swift_code"
                    name="swift_code"
                    placeholder="Enter swift code"
                    value={formData.swift_code}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Input
                    id="branch"
                    name="branch"
                    placeholder="Enter branch name"
                    value={formData.branch}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {currentMethod ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMethodsManagement;
