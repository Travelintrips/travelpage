// Script to check React versions
const { execSync } = require("child_process");

try {
  console.log("Checking React versions...");
  console.log("\n=== React versions ===");
  execSync("npm ls react", { stdio: "inherit" });

  console.log("\n=== React DOM versions ===");
  execSync("npm ls react-dom", { stdio: "inherit" });

  console.log("\n=== All React-related packages ===");
  execSync("npm ls | grep react", { stdio: "inherit" });
} catch (error) {
  console.error("Error checking versions:", error.message);
}
