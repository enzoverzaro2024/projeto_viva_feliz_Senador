import sys

file_path = r'c:\Users\enzoverzaro\Documents\ANTI-PROJETOS\CARTÃOCREDITO\eventcard\src\app\admin\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Localizar o bloco problemático na aba de reforço
# Sabemos que está entre as linhas 2370 e 2400 aproximadamente
found = False
for i in range(len(lines)):
    if '<option value={4}>🚫 Não é Zap</option>' in lines[i] and '<option value={2}>❌ Falhou</option>' in lines[i+1]:
        # Encontramos o local. Lines[i+2] deve ser o '</td>' mal formatado e sem '</select>'
        if '</td>' in lines[i+2] and '</select>' not in lines[i+2]:
            lines[i+2] = '                                  </select>\n                                </td>\n'
            found = True
            print(f"Fixed at line {i+3}")
            break

if found:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("File updated successfully.")
else:
    print("Could not find the target block.")
