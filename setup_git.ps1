# Refresh PATH to include newly installed Git
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    # Check default Git install path if not found in PATH yet
    $gitPath = "C:\Program Files\Git\cmd"
    if (Test-Path "$gitPath\git.exe") {
        $env:Path += ";$gitPath"
    } else {
        Write-Host "Git not found in PATH or default install directory."
        exit 1
    }
}

Write-Host "Initializing local git repository..."
git init

# Set default branch to main
git checkout -b main

Write-Host "Adding remote origin..."
# Check if remote already exists, if so remove it
git remote remove origin 2>$null
git remote add origin https://github.com/luizrogeriopx/cursodigitacao.git

Write-Host "Fetching remote repository..."
git fetch origin

Write-Host "Resetting to remote main..."
git reset --mixed origin/main

Write-Host "Staging files..."
git add .

Write-Host "Committing changes..."
# Configure local placeholder git user in case user has not set git global user
git config --local user.name "Luiz Rogerio"
git config --local user.email "luizrogeriopx@users.noreply.github.com"

git commit -m "feat: redesign da pagina inicial com tema escuro e teclado"

Write-Host "Done!"
