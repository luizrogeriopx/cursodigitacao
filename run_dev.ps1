# Add Node.js to session PATH if not already present
if ($env:Path -notlike "*C:\Program Files\nodejs*") {
    $env:Path += ";C:\Program Files\nodejs"
}

# Run the development server
npm run dev
