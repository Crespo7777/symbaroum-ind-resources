@echo off
echo Sincronizando arquivos do modulo Symbaroum Ind Resources...
robocopy "C:\Projetos\Symbaroum Resources\symbaroum-ind-resources" "C:\Users\heito\Documents\FoundryVTT\Data\modules\symbaroum-ind-resources" /MIR /XD .git
echo Sincronizacao concluida!
pause
