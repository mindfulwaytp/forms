// Auto-import all .json files inside the /forms folder
const modules = import.meta.glob('./forms/*.json', { eager: true });

const forms = {};
const formNames = {}; // map for display names

for (const path in modules) {
  // Get file name without path or extension
  const fileName = path.split('/').pop().replace('.json', '');

  // Use kebab-case as key: srs2_adult_self => srs2-adult-self
  const key = fileName.replace(/_/g, '-');

  // Create display name: srs2_adult_self => SRS2 Adult Self
  const displayName = fileName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase()); // Title Case

  forms[key] = modules[path].default;
  formNames[key] = displayName;
}

export { forms, formNames };
