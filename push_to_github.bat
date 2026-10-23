@echo off
echo ====================================================
echo  SalesSpark - Push to GitHub
echo  Target: https://github.com/NileshPatni123/SalesSpark
echo ====================================================
echo.
echo Please ensure you have created an empty repository on GitHub:
echo URL: https://github.com/new
echo Name: SalesSpark
echo (Leave "Add a README file" UNCHECKED)
echo.
pause
echo Pushing to https://github.com/NileshPatni123/SalesSpark.git ...
git branch -M main
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ====================================================
    echo  SUCCESS! Project published to GitHub:
    echo  https://github.com/NileshPatni123/SalesSpark
    echo ====================================================
) else (
    echo ====================================================
    echo  Push failed. Please check:
    echo  1. Did you create 'SalesSpark' on https://github.com/new ?
    echo  2. Are you signed in with your GitHub account?
    echo ====================================================
)
pause
