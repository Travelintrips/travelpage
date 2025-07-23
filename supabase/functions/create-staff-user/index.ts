import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      email,
      password,
      fullName,
      roleId,
      roleName,
      adminUserId,
      phone,
      address,
      referencePhone,
      ktpNumber,
      simNumber,
      licenseExpiry,
      skckImage,
      kkImage,
      simImage,
      ktpImage,
      department,
      position,
      employeeId,
      idCardImage,
      religion,
      ethnicity,
      firstName,
      lastName,
      userId, // For updates
      isUpdate = false, // Flag to determine if this is an update operation
    } = await req.json();

    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    console.log(isUpdate ? "Updating staff user:" : "Creating staff user:", {
      email,
      fullName,
      roleId,
      roleName,
      phone,
      address,
      referencePhone,
      ktpNumber,
      simNumber,
      licenseExpiry,
      skckImage,
      kkImage,
      simImage,
      ktpImage,
      department,
      position,
      employeeId,
      religion,
      ethnicity,
      firstName,
      lastName,
      userId,
      isUpdate,
    });

    // Validate required fields
    if (!email || !fullName || !roleId) {
      throw new Error("Missing required fields: email, fullName, or roleId");
    }

    if (isUpdate && !userId) {
      throw new Error("userId is required for updates");
    }

    let authData;

    if (isUpdate && userId) {
      // For updates, we don't create a new auth user, just use the existing userId
      authData = { user: { id: userId, email } };
      console.log("Updating existing user:", userId);
    } else {
      // Create the user using admin client (this won't affect current session)
      const { data: newAuthData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          user_metadata: {
            full_name: fullName,
            role: roleName,
            role_id: roleId.toString(),
          },
          email_confirm: true, // Auto-confirm email so user can login immediately
        });

      if (authError) {
        console.error("Error creating auth user:", authError);
        throw authError;
      }

      if (!newAuthData.user) {
        throw new Error("No user data returned from auth creation");
      }

      authData = newAuthData;
      console.log("Auth user created:", authData.user.id);

      // Explicitly confirm the email address to ensure immediate login capability
      const { error: confirmError } =
        await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
          email_confirm: true,
        });

      if (confirmError) {
        console.error("Error confirming email:", confirmError);
        // Don't throw here as the user is already created, just log the error
      } else {
        console.log("Email confirmed for user:", authData.user.id);
      }
    }

    // For updates, fetch existing user data to preserve it
    let existingUserData = null;
    if (isUpdate && userId) {
      const { data: existingUser, error: fetchUserError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (fetchUserError) {
        console.warn("Could not fetch existing user data:", fetchUserError);
      } else {
        existingUserData = existingUser;
        console.log(
          "Fetched existing user data for preservation:",
          existingUserData,
        );
      }
    }

    // Insert/update user in users table
    const userUpdateData = {
      id: authData.user.id,
      email: authData.user.email || email,
      full_name: fullName,
      phone_number:
        phone && phone.trim() !== ""
          ? phone
          : isUpdate
            ? existingUserData?.phone_number || ""
            : "",
      role_id: roleId,
      updated_at: new Date().toISOString(),
    };

    // Only add created_at for new users
    if (!isUpdate) {
      userUpdateData.created_at = new Date().toISOString();
    }

    const { error: userError } = await supabaseAdmin
      .from("users")
      .upsert(userUpdateData, {
        onConflict: "id",
      });

    if (userError) {
      console.error("Error creating user record:", userError);
      throw userError;
    }

    console.log("User record created/updated in users table");

    // For updates, fetch existing staff data to preserve it
    let existingStaffData = null;
    if (isUpdate && userId) {
      const { data: existingData, error: fetchError } = await supabaseAdmin
        .from("staff")
        .select("*")
        .eq("id", userId)
        .single();

      if (fetchError) {
        console.warn("Could not fetch existing staff data:", fetchError);
      } else {
        existingStaffData = existingData;
        console.log(
          "Fetched existing staff data for preservation:",
          existingStaffData,
        );
      }
    }

    // Insert/update staff record in staff table
    const staffUpdateData = {
      id: authData.user.id,
      name: fullName,
      email: authData.user.email || email,
      phone:
        phone && phone.trim() !== ""
          ? phone
          : isUpdate
            ? existingStaffData?.phone || ""
            : "N/A",
      role_id: roleId,
      role: roleName,
      user_id: authData.user.id,
      full_name: fullName,
      reference_phone:
        referencePhone && referencePhone.trim() !== ""
          ? referencePhone
          : existingStaffData?.reference_phone,
      address:
        address && address.trim() !== "" ? address : existingStaffData?.address,
      ktp_number:
        ktpNumber && ktpNumber.trim() !== ""
          ? ktpNumber
          : existingStaffData?.ktp_number,
      sim_number:
        simNumber && simNumber.trim() !== ""
          ? simNumber
          : existingStaffData?.sim_number,
      license_expiry: licenseExpiry || existingStaffData?.license_expiry,
      department:
        department && department.trim() !== ""
          ? department
          : existingStaffData?.department,
      position:
        position && position.trim() !== ""
          ? position
          : existingStaffData?.position || roleName,
      employee_id:
        employeeId && employeeId.trim() !== ""
          ? employeeId
          : existingStaffData?.employee_id ||
            (isUpdate ? existingStaffData?.employee_id : `EMP${Date.now()}`),
      id_card_url: idCardImage || existingStaffData?.id_card_url,
      ktp_url: ktpImage || existingStaffData?.ktp_url,
      sim_url: simImage || existingStaffData?.sim_url,
      kk_url: kkImage || existingStaffData?.kk_url,
      skck_url: skckImage || existingStaffData?.skck_url,
      religion:
        religion && religion.trim() !== ""
          ? religion
          : existingStaffData?.religion,
      ethnicity:
        ethnicity && ethnicity.trim() !== ""
          ? ethnicity
          : existingStaffData?.ethnicity,
      first_name:
        firstName && firstName.trim() !== ""
          ? firstName
          : existingStaffData?.first_name,
      last_name:
        lastName && lastName.trim() !== ""
          ? lastName
          : existingStaffData?.last_name,
      updated_at: new Date().toISOString(),
    };

    // Only add created_at for new users
    if (!isUpdate) {
      staffUpdateData.created_at = new Date().toISOString();
    }

    const { error: staffError } = await supabaseAdmin
      .from("staff")
      .upsert(staffUpdateData, {
        onConflict: "id",
      });

    if (staffError) {
      console.error("Error creating/updating staff record:", staffError);
      throw staffError;
    }

    console.log("Staff record created/updated in staff table");

    return new Response(
      JSON.stringify({
        success: true,
        action: isUpdate ? "updated" : "created",
        user: {
          id: authData.user.id,
          email: authData.user.email || email,
          full_name: fullName,
          role: roleName,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in create-staff-user function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
