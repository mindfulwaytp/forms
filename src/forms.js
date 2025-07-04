// forms.js

// Dynamically import all JSON files inside the /forms folder
const modules = import.meta.glob('./forms/*.json', { eager: true });

const forms = {};  // Object to store form data
const formNames = {};  // Object to store display names for each form

// Loop through each imported file and process
for (const path in modules) {
  // Extract the file name from the path and remove the .json extension
  const fileName = path.split('/').pop().replace('.json', '');

  // Convert to kebab-case for the form key (e.g., srs2_adult_self => srs2-adult-self)
  const key = fileName.replace(/_/g, '-');

  // Create a display name from the file name (e.g., srs2_adult_self => SRS2 Adult Self)
  const displayName = fileName
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, char => char.toUpperCase()); // Convert to Title Case

  // Debugging: Log the key and display name for each form
  console.log(`Processing form: ${key}`);
  console.log(`Display Name for ${key}: ${displayName}`);

  // Add the form data to the forms object with the key
  forms[key] = modules[path].default;

  // Add the display name to the formNames object with the same key
  formNames[key] = displayName;
}

// Debugging: Log the full forms object to verify all forms are loaded correctly
console.log("All Forms Loaded:", forms);

// Debugging: Log the form names to verify display names
console.log("All Form Display Names:", formNames);

// Export forms and formNames for use in other parts of the application
export { forms, formNames };
