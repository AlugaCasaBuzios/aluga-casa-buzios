# Baixa as 5 fotos públicas principais de cada anúncio do Airbnb.
# Execute este arquivo dentro da pasta raiz do projeto:
# C:\Users\Notebook-Acer-3\OneDrive\Documentos\GitHub\aluga-casa-buzios
#
# As imagens serão salvas em:
# public\images\airbnb-import\<nome-do-imovel>\
#
# O script NÃO substitui as fotos atuais do site.

$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\package.json")) {
    Write-Host ""
    Write-Host "ERRO: execute este script dentro da pasta raiz do projeto." -ForegroundColor Red
    Write-Host "A pasta atual precisa conter o arquivo package.json." -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36"
    "Accept"     = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    "Referer"    = "https://www.airbnb.com.br/"
}

$imoveis = @{
    "casa-toriba" = @(
        @{ Arquivo = "1.png"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1671794373671107565/original/a877d226-195c-4b81-8918-023d6b4481a5.png" },
        @{ Arquivo = "2.png"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1671794373671107565/original/686fc681-bd19-42b8-8794-cf3bad24b7a8.png" },
        @{ Arquivo = "3.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1671794373671107565/original/d48b7b84-2a18-4709-a349-7e8c71a74cc5.jpeg" },
        @{ Arquivo = "4.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1671794373671107565/original/b80d1223-6ec4-4c11-8190-c79928d433cc.jpeg" },
        @{ Arquivo = "5.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1671794373671107565/original/647575bc-ed21-4b44-bcc6-130293d25960.jpeg" }
    )

    "casa-da-margarida" = @(
        @{ Arquivo = "1.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-33396295/original/6d9aab5a-1e59-4cbd-a5bf-1427eb02d745.jpeg" },
        @{ Arquivo = "2.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-33396295/original/340b49bd-5785-4675-b538-982f923e662b.jpeg" },
        @{ Arquivo = "3.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-33396295/original/acf70ff4-1394-4fa8-940c-283675355a66.jpeg" },
        @{ Arquivo = "4.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-33396295/original/06002e85-de65-49ca-af94-3d24a3d8045c.jpeg" },
        @{ Arquivo = "5.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-33396295/original/3ae270e0-df8a-4e2c-bc0a-2193a6babc1e.jpeg" }
    )

    "arete-top" = @(
        @{ Arquivo = "1.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1572511786198194351/original/6ef3ad55-553e-48d7-b250-1572b8292956.jpeg" },
        @{ Arquivo = "2.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1572511786198194351/original/c0c3aa8a-b691-42aa-a3bd-93c2be6c7099.jpeg" },
        @{ Arquivo = "3.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1572511786198194351/original/57a7094d-0be7-4520-a7c9-e41de0691448.jpeg" },
        @{ Arquivo = "4.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1572511786198194351/original/3731b0cd-8269-485d-a08a-6b7879f7ba35.jpeg" },
        @{ Arquivo = "5.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1572511786198194351/original/6a67cfd5-96c9-46a6-a3ff-3bcbc600e51a.jpeg" }
    )

    "casa-doce-mar" = @(
        @{ Arquivo = "1.png"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1573499649457752998/original/8d2767a2-7286-43e9-9f8b-db3611c320d3.png" },
        @{ Arquivo = "2.png"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1573499649457752998/original/99b789d1-382f-4f6e-8971-77934ce1f7eb.png" },
        @{ Arquivo = "3.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1573499649457752998/original/06c0dfd9-f708-4108-8105-79188ecbad0b.jpeg" },
        @{ Arquivo = "4.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1573499649457752998/original/3a85a6eb-5ba6-458e-a58e-59da7e4e0b05.jpeg" },
        @{ Arquivo = "5.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1573499649457752998/original/3593a4c5-f025-4eb1-9211-76225958f1ab.jpeg" }
    )

    "casa-em-buzios" = @(
        @{ Arquivo = "1.jpg"; URL = "https://a0.muscache.com/im/pictures/airflow/Hosting-45951143/original/e24b8468-0fec-4809-a03d-1fd84e8e4c21.jpg" },
        @{ Arquivo = "2.jpg"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-45951143/original/392adb9a-8dfe-4de9-93b1-579ff9b52dba.jpeg" },
        @{ Arquivo = "3.jpg"; URL = "https://a0.muscache.com/im/pictures/airflow/Hosting-45951143/original/6a938480-4c4d-45b7-b0df-3a3bf70753f8.jpg" },
        @{ Arquivo = "4.png"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-45951143/original/c2451fa5-f82a-4047-8fe7-111a77d3b2f5.png" },
        @{ Arquivo = "5.jpg"; URL = "https://a0.muscache.com/im/pictures/airflow/Hosting-45951143/original/7d30dddb-8c21-446a-a6f5-a03d27f87212.jpg" }
    )

    "conforto" = @(
        @{ Arquivo = "1.png"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1159472082721553654/original/4b3a8e84-9346-453f-b6b5-8db04ff7ddab.png" },
        @{ Arquivo = "2.png"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1159472082721553654/original/39fe8f54-e3d8-4ffd-8d11-c27e18d7a690.png" },
        @{ Arquivo = "3.jpg"; URL = "https://a0.muscache.com/im/pictures/miso/Hosting-1159472082721553654/original/b4d648d5-0704-4847-9c86-2d29a52dfd43.jpeg" },
        @{ Arquivo = "4.png"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1159472082721553654/original/6679adac-deba-4648-a54e-e24c953beb55.png" },
        @{ Arquivo = "5.png"; URL = "https://a0.muscache.com/im/pictures/hosting/Hosting-1159472082721553654/original/6646806b-7329-49ce-9d6f-6bb7262523b3.png" }
    )
}

$base = Join-Path (Get-Location) "public\images\airbnb-import"
New-Item -ItemType Directory -Force -Path $base | Out-Null

$total = 0
$sucesso = 0
$falhas = 0

foreach ($nome in $imoveis.Keys) {
    $pasta = Join-Path $base $nome
    New-Item -ItemType Directory -Force -Path $pasta | Out-Null

    Write-Host ""
    Write-Host "Baixando fotos de: $nome" -ForegroundColor Cyan

    foreach ($foto in $imoveis[$nome]) {
        $total++
        $destino = Join-Path $pasta $foto.Arquivo

        try {
            Invoke-WebRequest `
                -Uri $foto.URL `
                -OutFile $destino `
                -Headers $headers `
                -MaximumRedirection 10

            $arquivo = Get-Item $destino

            if ($arquivo.Length -lt 1000) {
                throw "O arquivo baixado está vazio ou incompleto."
            }

            $sucesso++
            Write-Host "  OK  $($foto.Arquivo)  $([math]::Round($arquivo.Length / 1KB)) KB" -ForegroundColor Green
        }
        catch {
            $falhas++
            Write-Host "  ERRO  $($foto.Arquivo): $($_.Exception.Message)" -ForegroundColor Red

            if (Test-Path $destino) {
                Remove-Item $destino -Force
            }
        }
    }
}

Write-Host ""
Write-Host "Download concluído." -ForegroundColor Cyan
Write-Host "Total: $total | Sucesso: $sucesso | Falhas: $falhas"
Write-Host ""
Write-Host "As fotos estão em:" -ForegroundColor Yellow
Write-Host $base
Write-Host ""
Write-Host "Revise as imagens antes de substituir as fotos atuais do site." -ForegroundColor Yellow
