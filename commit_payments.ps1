$env:Path += ";C:\Program Files\Git\cmd"
git add .
git commit -m "feat: adicionar checkout do stripe, webhook api e protecao de rotas"
git push origin main
Remove-Item commit_payments.ps1
