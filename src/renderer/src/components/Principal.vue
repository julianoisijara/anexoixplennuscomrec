<script setup lang="ts">
import { ref, computed, watchEffect, watch, onUnmounted } from 'vue'

interface CustoItem {
  custo: number
  quantidade: number
  diasParciais: number
}

interface FormData {
  os: string
  revisorOs: string
  tpf: number
  diasT: number
  diasUteis: number
  diasSenior: number
  diasPleno: number
  senior: {
    totalDiasOtp: number
    parcial: number
  }
  pleno: {
    totalDiasOtp: number
    parcial: number
  }
  linhasCod: {
    item4: number
    item41: number
    item42: number
    item43: number
    item44: number
    item45: number
  }
  item7: number
  custos: {
    javaSenior: CustoItem
    javaPleno: CustoItem
    formsSenior: CustoItem
    formsPleno: CustoItem
    genexusSenior: CustoItem
    genexusPleno: CustoItem
  }
}

const osPrefix = 'COMREC_OS'
const ipcRenderer =
  typeof window !== 'undefined' && window.electron ? window.electron.ipcRenderer : null

const formData = ref<FormData>({
  os: '',
  revisorOs: '',
  tpf: 0,
  diasT: 0,
  diasUteis: 0,
  diasSenior: 0,
  diasPleno: 0,
  senior: {
    totalDiasOtp: 0,
    parcial: 0
  },
  pleno: {
    totalDiasOtp: 0,
    parcial: 0
  },
  linhasCod: {
    item4: 0,
    item41: 0,
    item42: 0,
    item43: 0,
    item44: 0,
    item45: 0
  },
  item7: 0,
  custos: {
    javaSenior: { custo: 26627.4, quantidade: 0, diasParciais: 0 },
    javaPleno: { custo: 18808.6, quantidade: 0, diasParciais: 0 },
    formsSenior: { custo: 26465.46, quantidade: 0, diasParciais: 0 },
    formsPleno: { custo: 18549.98, quantidade: 0, diasParciais: 0 },
    genexusSenior: { custo: 27213.99, quantidade: 0, diasParciais: 0 },
    genexusPleno: { custo: 18185.32, quantidade: 0, diasParciais: 0 }
  }
})

const canUseStorage = typeof window !== 'undefined'
const extractCostOnly = (
  costs: Record<string, Partial<CustoItem>>
): Record<string, { custo: number }> => {
  const result: Record<string, { custo: number }> = {}
  for (const key in costs) {
    if (Object.prototype.hasOwnProperty.call(costs, key)) {
      result[key] = { custo: costs[key]?.custo ?? 0 }
    }
  }
  return result
}

if (canUseStorage) {
  const savedCosts = localStorage.getItem('custos')
  if (savedCosts) {
    try {
      const parsedCosts = JSON.parse(savedCosts) as Record<string, Partial<CustoItem>>
      const costsOnly = extractCostOnly(parsedCosts)
      let key: keyof FormData['custos']
      for (key in formData.value.custos) {
        if (costsOnly[key]) {
          formData.value.custos[key].custo = costsOnly[key].custo
        }
      }
    } catch {
      // Ignorar dados corrompidos no storage
    }
  }
}

// Salvar custos no localStorage quando houver alterações
watch(
  () => formData.value.custos,
  (newCosts) => {
    if (!canUseStorage) return
    localStorage.setItem('custos', JSON.stringify(extractCostOnly(newCosts)))
  },
  { deep: true }
)

const totalDiasT = computed((): number => {
  const { senior, pleno, diasUteis } = formData.value

  const resultDiasT =
    Number(senior.totalDiasOtp || 0) * Number(diasUteis || 0) +
    Number(senior.parcial || 0) +
    Number(pleno.totalDiasOtp || 0) * Number(diasUteis || 0) +
    Number(pleno.parcial || 0)

  return isNaN(resultDiasT) ? 0 : resultDiasT
})

const totalDiasSenior = computed((): number => {
  const { senior, diasUteis } = formData.value

  const resultDiasSenior =
    Number(senior.totalDiasOtp || 0) * Number(diasUteis || 0) + Number(senior.parcial || 0)

  return isNaN(resultDiasSenior) ? 0 : resultDiasSenior
})

const totalDiasPleno = computed((): number => {
  const { pleno, diasUteis } = formData.value

  const resultDiasPleno =
    Number(pleno.totalDiasOtp || 0) * Number(diasUteis || 0) + Number(pleno.parcial || 0)

  return isNaN(resultDiasPleno) ? 0 : resultDiasPleno
})

const calculoItemQuatroUm = computed((): number => {
  const { tpf, diasT } = formData.value
  const numDiasT = Number(diasT || 0)
  if (numDiasT === 0) return 0
  const resultado = Number(tpf || 0) / numDiasT
  return parseFloat(resultado.toFixed(2))
})

const calculoItemQuatroDois = computed((): number => {
  const val = Number(calculoItemQuatroUm.value || 0)
  if (val === 0) return 0
  const resultado = val / 0.56
  return parseFloat(resultado.toFixed(2))
})

const calculoItemQuatroQuarto = computed((): number => {
  const { diasT, linhasCod } = formData.value
  const numDiasT = Number(diasT || 0)
  const numItem43 = Number(linhasCod.item43 || 0)
  if (numItem43 === 0 || numDiasT === 0) return 0
  const resultado = numItem43 / numDiasT
  return parseFloat(resultado.toFixed(2))
})

const calculoItemQuatroCinco = computed((): number => {
  const val = Number(calculoItemQuatroQuarto.value || 0)
  if (val === 0) return 0
  const resultado = val / 33.33
  return parseFloat(resultado.toFixed(2))
})

const calculoItemSete = computed((): number => {
  const { linhasCod } = formData.value
  const numItem42 = Number(linhasCod.item42 || 0)
  const numItem45 = Number(linhasCod.item45 || 0)
  if (numItem42 === 0 || numItem45 === 0) return 0
  const resultado = 0.25 * numItem42 + 0.2 * numItem45 + 0.4 * 1 + 0.15 * 1
  return parseFloat(resultado.toFixed(2))
})

watchEffect(() => {
  formData.value.diasT = totalDiasT.value
  formData.value.diasSenior = totalDiasSenior.value
  formData.value.diasPleno = totalDiasPleno.value
  formData.value.linhasCod.item41 = calculoItemQuatroUm.value
  formData.value.linhasCod.item42 = calculoItemQuatroDois.value
  formData.value.linhasCod.item43 = formData.value.linhasCod.item4
  formData.value.linhasCod.item44 = calculoItemQuatroQuarto.value
  formData.value.linhasCod.item45 = calculoItemQuatroCinco.value
  formData.value.item7 = calculoItemSete.value
})

const totalSenior = computed((): number => {
  const { javaSenior, formsSenior, genexusSenior } = formData.value.custos
  const diasUteisVal = Number(formData.value.diasUteis || 1) || 1

  const resultJavaSenior =
    Number(javaSenior.custo || 0) * Number(javaSenior.quantidade || 0) +
    Number(formsSenior.custo || 0) * Number(formsSenior.quantidade || 0) +
    Number(genexusSenior.custo || 0) * Number(genexusSenior.quantidade || 0) +
    (Number(javaSenior.custo || 0) / diasUteisVal) * Number(javaSenior.diasParciais || 0) +
    (Number(formsSenior.custo || 0) / diasUteisVal) * Number(formsSenior.diasParciais || 0) +
    (Number(genexusSenior.custo || 0) / diasUteisVal) * Number(genexusSenior.diasParciais || 0)

  return isNaN(resultJavaSenior) ? 0 : resultJavaSenior
})

const totalPleno = computed((): number => {
  const { javaPleno, formsPleno, genexusPleno } = formData.value.custos
  const diasUteisVal = Number(formData.value.diasUteis || 1) || 1

  const resultJavaPleno =
    Number(javaPleno.custo || 0) * Number(javaPleno.quantidade || 0) +
    Number(formsPleno.custo || 0) * Number(formsPleno.quantidade || 0) +
    Number(genexusPleno.custo || 0) * Number(genexusPleno.quantidade || 0) +
    (Number(javaPleno.custo || 0) / diasUteisVal) * Number(javaPleno.diasParciais || 0) +
    (Number(formsPleno.custo || 0) / diasUteisVal) * Number(formsPleno.diasParciais || 0) +
    (Number(genexusPleno.custo || 0) / diasUteisVal) * Number(genexusPleno.diasParciais || 0)

  return isNaN(resultJavaPleno) ? 0 : resultJavaPleno
})

const total = computed(() => totalSenior.value + totalPleno.value)

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const invalidFields = ref({
  os: false,
  revisorOs: false,
  tpf: false,
  diasUteis: false,
  linhasCod: false
})

const customAlert = ref({
  visible: false,
  message: ''
})

function showAlert(message: string): void {
  customAlert.value.visible = true
  customAlert.value.message = message
}

function closeAlert(): void {
  customAlert.value.visible = false
}

// Informações "Sobre o programa" (mantenha a versão sincronizada com o package.json)
const showAbout = ref(false)
const appInfo = {
  nome: 'Anexo IX Plennus (ComRec)',
  autor: '1T Juliano CCARJ',
  email: 'julianojri@fab.mil.br',
  versao: '1.1.0'
}

function openAbout(): void {
  showAbout.value = true
}

function closeAbout(): void {
  showAbout.value = false
}

// Abre o modal "Sobre" quando acionado pelo menu nativo do aplicativo
if (ipcRenderer) {
  ipcRenderer.on('open-about', openAbout)
  onUnmounted(() => {
    ipcRenderer.removeAllListeners('open-about')
  })
}

function validateInput(event: KeyboardEvent): void {
  const input = event.target as HTMLInputElement
  if (event.key === '-' || event.code === 'Minus' || Number(input.value) < 0) {
    input.value = '0'
    event.preventDefault()
  }
}

function clearInputs(): void {
  formData.value.os = ''
  formData.value.tpf = 0
  formData.value.diasSenior = 0
  formData.value.diasPleno = 0
  formData.value.senior.totalDiasOtp = 0
  formData.value.senior.parcial = 0
  formData.value.pleno.totalDiasOtp = 0
  formData.value.pleno.parcial = 0
  formData.value.linhasCod.item4 = 0

  // Limpar quantidade e dias parciais dos custos
  Object.values(formData.value.custos).forEach((item) => {
    item.quantidade = 0
    item.diasParciais = 0
  })

  invalidFields.value.os = false
  invalidFields.value.revisorOs = false
  invalidFields.value.tpf = false
  invalidFields.value.diasUteis = false
  invalidFields.value.linhasCod = false
}

function validateRequiredForExport(): boolean {
  const trimmedOs = formData.value.os.trim()
  const trimmedRevisor = formData.value.revisorOs.trim().length > 5

  invalidFields.value.os = !trimmedOs
  invalidFields.value.revisorOs = !trimmedRevisor
  invalidFields.value.tpf = formData.value.tpf <= 0
  invalidFields.value.diasUteis = formData.value.diasUteis <= 0
  invalidFields.value.linhasCod = formData.value.linhasCod.item4 <= 0

  return !Object.values(invalidFields.value).some(Boolean)
}

// FUNÇÃO EXPORT TO PDF - AGORA DENTRO DO SCRIPT SETUP
async function exportToPDF(): Promise<void> {
  try {
    if (!validateRequiredForExport()) {
      if (invalidFields.value.os) {
        showAlert('Informe o número da OS antes de exportar o PDF.')
        return
      }
      if (invalidFields.value.revisorOs) {
        showAlert('Informe o Revisor OS antes de exportar o PDF.')
        return
      }
      if (invalidFields.value.tpf) {
        showAlert('Informe o TPF antes de exportar o PDF.')
        return
      }
      if (invalidFields.value.diasUteis) {
        showAlert('Informe os Dias Úteis antes de exportar o PDF.')
        return
      }
      if (invalidFields.value.linhasCod) {
        showAlert('Informe as Linhas de Cód antes de exportar o PDF.')
        return
      }
      return
    }

    const trimmedName = formData.value.os.trim()
    const finalFileName = trimmedName ? `${osPrefix}_${trimmedName}.pdf` : `${osPrefix}.pdf`

    const originalTitle = document.title
    const titleName = finalFileName.replace(/\.pdf$/i, '')
    document.title = titleName

    try {
      if (ipcRenderer) {
        await ipcRenderer.invoke('export-pdf', {
          defaultFileName: finalFileName
        })
        return
      }

      // Fallback para navegador
      window.print()
    } catch (error) {
      console.error('Erro ao exportar PDF via IPC/Impressora:', error)
      showAlert('Erro ao exportar PDF. Tente novamente.')
    } finally {
      document.title = originalTitle
    }
  } catch (error) {
    console.error('Erro no fluxo de exportação:', error)
    showAlert('Erro inesperado ao exportar PDF.')
  }
}
</script>

<template>
  <div class="form-container">
    <div class="header">
      <h2>Formulário Anexo IX Plennus (ComRec)</h2>
      <div class="form-row" style="margin-top: 5px">
        <label class="label-os">OS:</label>
        <input
          v-model="formData.os"
          type="text"
          :class="['yellow-input', { 'invalid-input': invalidFields.os }]"
          style="color: black"
          @input="invalidFields.os = false"
          @keydown="validateInput"
        />
      </div>
      <div class="form-row">
        <label class="label-os">Revisor OS:</label>
        <input
          v-model="formData.revisorOs"
          type="text"
          :class="['yellow-input', { 'invalid-input': invalidFields.revisorOs }]"
          style="color: black"
          @input="invalidFields.revisorOs = false"
        />
      </div>
      <div class="button-group">
        <button class="export-button" @click="exportToPDF">Exportar PDF</button>
        <button class="clear-button" @click="clearInputs">Limpar Dados</button>
      </div>
    </div>

    <div class="form-grid">
      <!-- Primeira coluna -->
      <div class="form-column">
        <div class="form-section">
          <div class="form-row">
            <label>DIAS ÚTEIS:</label>
            <input
              v-model="formData.diasUteis"
              type="number"
              :class="['yellow-input', { 'invalid-input': invalidFields.diasUteis }]"
              style="color: black"
              min="0"
              @input="invalidFields.diasUteis = false"
              @keydown="validateInput"
            />
          </div>
          <div class="form-row">
            <label>TPF:</label>
            <input
              v-model="formData.tpf"
              type="number"
              :class="['yellow-input', { 'invalid-input': invalidFields.tpf }]"
              style="color: black"
              min="0"
              @input="invalidFields.tpf = false"
              @keydown="validateInput"
            />
          </div>
          <div class="form-row">
            <label>DIAS T:</label>
            <input
              v-model="formData.diasT"
              type="number"
              class="black-input"
              style="color: white"
              readonly
            />
          </div>
          <div class="form-row">
            <label>DIAS Senior:</label>
            <input
              v-model="formData.diasSenior"
              type="number"
              class="black-input"
              style="color: white"
              readonly
            />
          </div>
          <div class="form-row">
            <label>DIAS Pleno:</label>
            <input
              v-model="formData.diasPleno"
              type="number"
              class="black-input"
              style="color: white"
              readonly
            />
          </div>
        </div>

        <div class="form-section">
          <h3>SÊNIOR</h3>
          <div class="form-row">
            <label>Funcionários FULL:</label>
            <input
              v-model="formData.senior.totalDiasOtp"
              type="number"
              class="yellow-input"
              style="color: black"
              min="0"
              @keydown="validateInput"
            />
          </div>
          <div class="form-row">
            <label>Dias Parciais:</label>
            <input
              v-model="formData.senior.parcial"
              type="number"
              class="yellow-input"
              style="color: black"
              min="0"
              @keydown="validateInput"
            />
          </div>
        </div>

        <div class="form-section">
          <h3>PLENO</h3>
          <div class="form-row">
            <label>Funcionários FULL:</label>
            <input
              v-model="formData.pleno.totalDiasOtp"
              type="number"
              class="yellow-input"
              style="color: black"
              min="0"
              @keydown="validateInput"
            />
          </div>
          <div class="form-row">
            <label>Dias Parciais:</label>
            <input
              v-model="formData.pleno.parcial"
              type="number"
              class="yellow-input"
              style="color: black"
              min="0"
              @keydown="validateInput"
            />
          </div>
        </div>
      </div>

      <!-- Segunda coluna -->
      <div class="form-column">
        <div class="form-section">
          <h3>ITEM 4</h3>
          <div class="form-row">
            <label>LINHAS DE CÓD:</label>
            <input
              v-model="formData.linhasCod.item4"
              type="number"
              :class="['yellow-input', { 'invalid-input': invalidFields.linhasCod }]"
              style="color: black"
              min="0"
              @input="invalidFields.linhasCod = false"
              @keydown="validateInput"
            />
          </div>
          <div class="form-row">
            <label>4.1:</label>
            <input
              v-model="formData.linhasCod.item41"
              type="number"
              class="black-input"
              style="color: white"
              readonly
            />
          </div>
          <div class="form-row">
            <label>4.2:</label>
            <input
              v-model="formData.linhasCod.item42"
              type="number"
              class="black-input"
              style="color: white"
              readonly
            />
          </div>
          <div class="form-row">
            <label>4.3:</label>
            <input
              v-model="formData.linhasCod.item43"
              type="number"
              class="black-input"
              style="color: white"
              readonly
            />
          </div>
          <div class="form-row">
            <label>4.4:</label>
            <input
              v-model="formData.linhasCod.item44"
              type="number"
              class="black-input"
              style="color: white"
              readonly
            />
          </div>
          <div class="form-row">
            <label>4.5:</label>
            <input
              v-model="formData.linhasCod.item45"
              type="number"
              class="black-input"
              style="color: white"
              readonly
            />
          </div>
        </div>

        <div class="form-section">
          <h3>ITEM 7</h3>
          <table>
            <tbody>
              <tr>
                <td>7.1 – IMS</td>
                <td>{{ formData.item7 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Terceira coluna -->
      <div class="form-column">
        <div class="form-section">
          <h3>Custos e Quantidades</h3>
          <table>
            <thead>
              <tr>
                <th style="color: black">Tipo</th>
                <th style="color: black">Custo 3</th>
                <th style="color: black">Quantidade no mês</th>
                <th style="color: black">Dias Parciais</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, key) in formData.custos" :key="key">
                <td style="text-transform: capitalize">{{ key.replace(/([A-Z])/g, ' $1') }}</td>
                <td>
                  <input
                    v-model="item.custo"
                    type="number"
                    class="yellow-input"
                    style="color: black"
                    min="0"
                    step="0.01"
                    @keydown="validateInput"
                  />
                </td>
                <td>
                  <input
                    v-model="item.quantidade"
                    type="number"
                    class="yellow-input"
                    style="color: black"
                    min="0"
                    @keydown="validateInput"
                  />
                </td>
                <td>
                  <input
                    v-model="item.diasParciais"
                    type="number"
                    class="yellow-input"
                    style="color: black"
                    min="0"
                    @keydown="validateInput"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="form-section">
          <h3>ITEM 8</h3>
          <table>
            <tbody>
              <tr>
                <td>8.2 SÊNIOR</td>
                <td>R$ {{ formatCurrency(totalSenior) }}</td>
              </tr>
              <tr>
                <td>8.3 PLENO</td>
                <td>R$ {{ formatCurrency(totalPleno) }}</td>
              </tr>
              <tr class="total-row">
                <td style="color: black">TOTAL</td>
                <td style="color: black">R$ {{ formatCurrency(total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  <div v-if="customAlert.visible" class="alert-overlay" @click.self="closeAlert">
    <div class="alert-modal">
      <img src="/src/assets/alerta.png" alt="Alerta" class="alert-image" />
      <p class="alert-message">{{ customAlert.message }}</p>
      <button class="alert-button" @click="closeAlert">OK</button>
    </div>
  </div>

  <div v-if="showAbout" class="about-overlay" @click.self="closeAbout">
    <div class="about-modal" role="dialog" aria-modal="true" aria-label="Sobre o programa">
      <div class="about-header">
        <div class="about-identity">
          <h3 class="about-app-name">{{ appInfo.nome }}</h3>
          <span class="about-version">Versão {{ appInfo.versao }}</span>
        </div>
        <button class="about-close" aria-label="Fechar" @click="closeAbout">×</button>
      </div>

      <div class="about-body">
        <img src="/src/assets/autor.png" alt="Foto do autor" class="about-photo" />
        <div class="about-author-info">
          <span class="about-author-label">Desenvolvido por</span>
          <span class="about-author-name">{{ appInfo.autor }}</span>
          <span class="about-email">{{ appInfo.email }}</span>
        </div>
      </div>

      <div class="about-footer">
        <button class="about-ok" @click="closeAbout">Fechar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-container {
  max-width: 100%;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.button-group {
  display: flex;
  gap: 10px;
}

.export-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.export-button:hover {
  background-color: #0056b3;
}

.clear-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.clear-button:hover {
  background-color: #c82333;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start;
}

.form-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section {
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 5px;
  background-color: white;
  height: fit-content;
}

.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

label {
  width: 150px;
  margin-right: 10px;
  color: black;
}

.label-os {
  margin-right: 1px;
  width: 90px;
}

input {
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 130px;
}

.invalid-input {
  border-color: #dc3545;
  box-shadow: 0 0 0 1px #dc3545;
}

.yellow-input {
  background-color: #ffffcc;
}

.black-input {
  background-color: #333;
  color: white;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

th,
td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
  color: black;
}

th {
  background-color: #f5f5f5;
}

input[type='number'] {
  width: 100px;
}

.total-row {
  font-weight: bold;
  background-color: #f5f5f5;
}

@media print {
  :global(body) {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    background-color: white !important;
    color: black !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .button-group,
  .export-button,
  .clear-button {
    display: none !important;
  }
  .form-container {
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    transform: scale(0.83) !important;
    transform-origin: top left !important;
  }
  .form-section {
    padding: 8px !important;
    margin-bottom: 8px !important;
  }
  .form-row {
    margin-bottom: 5px !important;
  }
  h2,
  h3 {
    margin-top: 0 !important;
    margin-bottom: 8px !important;
  }
  table {
    margin-top: 5px !important;
  }
  th,
  td {
    padding: 4px 6px !important;
  }
}
@page {
  size: A4 landscape;
  margin: 8mm;
}

h2,
h3 {
  color: black;
  margin-bottom: 15px;
}

.alert-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.35);
  z-index: 9999;
}

.alert-modal {
  width: min(360px, calc(100vw - 32px));
  background-color: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.alert-image {
  width: 72px;
  height: 72px;
  object-fit: contain;
  margin-bottom: 8px;
}

.alert-message {
  color: #222;
  margin: 8px 0 16px;
}

.alert-button {
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 18px;
  cursor: pointer;
}

.alert-button:hover {
  background-color: #0056b3;
}

.about-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 9999;
}

.about-modal {
  width: min(400px, calc(100vw - 32px));
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  animation: about-in 0.18s ease-out;
}

@keyframes about-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.about-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #ececec;
}

.about-identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.about-app-name {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
}

.about-version {
  font-size: 13px;
  color: #6c757d;
}

.about-close {
  background: none;
  border: none;
  font-size: 20px;
  line-height: 1;
  padding: 2px 4px;
  color: #999;
  cursor: pointer;
  border-radius: 4px;
}

.about-close:hover {
  color: #333;
  background-color: #f0f0f0;
}

.about-body {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.about-photo {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.about-author-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  min-width: 0;
}

.about-author-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8a8a8a;
}

.about-author-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.about-email {
  font-size: 13px;
  color: #555;
  word-break: break-all;
}

.about-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  background-color: #f8f9fa;
  border-top: 1px solid #ececec;
}

.about-ok {
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 7px 20px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.about-ok:hover {
  background-color: #0056b3;
}
</style>
