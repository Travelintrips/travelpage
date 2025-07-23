import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the function name from command line arguments
const functionName = process.argv[2];

if (!functionName) {
  console.error("Error: Function name is required");
  console.error("Usage: npm run deploy:function <function-name>");
  process.exit(1);
}

// Path to the function
const functionPath = path.join(
  __dirname,
  "..",
  "supabase",
  "functions",
  functionName,
);

// Check if function exists
if (!fs.existsSync(functionPath)) {
  console.error(
    `Error: Function '${functionName}' does not exist at ${functionPath}`,
  );
  process.exit(1);
}

// Check if index.ts exists
if (!fs.existsSync(path.join(functionPath, "index.ts"))) {
  console.error(`Error: index.ts not found in ${functionPath}`);
  process.exit(1);
}

console.log(`Deploying function: ${functionName}...`);

try {
  // Get Supabase project ID from environment variable
  const projectId = process.env.SUPABASE_PROJECT_ID;

  if (!projectId) {
    console.error("Error: SUPABASE_PROJECT_ID environment variable is not set");
    process.exit(1);
  }

  // Deploy the function using Supabase REST API
  const command = `curl -X POST https://api.supabase.com/v1/projects/${projectId}/functions/${functionName}/deploy \
    -H "Authorization: Bearer ${process.env.SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json"`;

  console.log("Executing deployment command...");
  execSync(command, { stdio: "inherit" });

  console.log(`Function '${functionName}' deployed successfully!`);
} catch (error) {
  console.error("Deployment failed:", error.message);
  process.exit(1);
}
