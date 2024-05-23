const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

fetch("https://gist.githubusercontent.com/guilhermeadams/dcbbb870a9d3e857c9d2a30beb96e3ef/raw/0133d11dc2d33074107a935536fb198105250082/codes.json", {signal: controller.signal})
    .then(response => response.json())
    .then(data => {
        initializeForm(groupCodesByOrgan(data));
    })
    .catch(error => {
        if (error.name === 'AbortError') {
            console.error('Fetch request timed out');
        } else {
            console.error('Error fetching the data:', error);
            alert('Ocorreu um erro ao buscar os dados. Por favor, tente novamente mais tarde.');
        }
    })
    .finally(() => {
        clearTimeout(timeout);
    });


function groupCodesByOrgan(data) {
    const organs = {};
    data.forEach(item => {
        if (organs[item.orgao]) {
        } else {
            organs[item.orgao] = [];
        }
        organs[item.orgao].push(item);
    });
    return organs;
}

function initializeForm(organs) {
    const rows = Object.entries(organs).map(([organ, codes]) => {
        const dropdownOptions = codes.map(code => `<option value="${code.codigo}">${code.codigo} - ${code.comentario}</option>`).join('');
        const dropdownHtml = `<select class="form-control" name="${organ}Code" id="${organ}Code">
      <option value="">Selecione um código</option>
      ${dropdownOptions}
    </select>`;

        return `<tr>
      <td>${organ}</td>
      <td><input type="checkbox" name="${organ}Normal" id="${organ}Normal" checked></td>
      <td><input type="checkbox" name="${organ}Anormal" id="${organ}Anormal"></td>
      <td><input type="checkbox" name="${organ}NotVisible" id="${organ}NotVisible"></td>
      <td><input type="text" name="${organ}Comment" id="${organ}Comment" readonly></td>
      <td>${dropdownHtml}</td>
    </tr>`;
    });

    $('#reportForm tbody').html(rows.join(''));

    $('select.form-control').change(function () {
        const organ = this.id.replace('Code', '');
        const selectedCode = $(this).val();
        const codeDetails = organs[organ].find(code => code.codigo === selectedCode);

        if (codeDetails) {
            if (codeDetails.status === 'NORMAL') {
                $(`#${organ}Normal`).prop('checked', true);
                $(`#${organ}Anormal`).prop('checked', false);
            } else {
                $(`#${organ}Normal`).prop('checked', false);
                $(`#${organ}Anormal`).prop('checked', true);
            }
            $(`#${organ}Comment`).val(codeDetails.comentario);
        } else {
            $(`#${organ}Normal`).prop('checked', false);
            $(`#${organ}Anormal`).prop('checked', false);
            $(`#${organ}Comment`).val('');
        }
    });

    function generatePDF(reportData) {
        let doc = new jsPDF();
        html2canvas(document.querySelector('.report-container')).then(canvas => {
            let imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 10, 10, 190, 150);

            doc.addPage();

            let diagnosticImpression = $('#diagnosticImpression').val();
            doc.text(10, 10, "Impressão Diagnóstica:");
            doc.text(10, 20, diagnosticImpression);

            for (let organ in reportData) {
                let data = reportData[organ];
                doc.addPage();
                doc.text(10, 10, organ);
                doc.text(10, 20, "Código: " + data.selectedCode);
                doc.text(10, 30, "Comentário: " + data.comment);
                doc.text(10, 40, "Impressão Diagnóstica: " + data.diagnosticImpression);
            }

            doc.save("relatorio_ultrassonografico.pdf");
        });
    }

    function validateForm() {
        if ($('#patientName').val() === '' || $('#patientID').val() === '' || $('#species').val() === '' || $('#sex').val() === '' || $('#ageYears').val() === '' || $('#ageMonths').val() === '' || $('#veterinarian').val() === '' || $('#date').val() === '' || $('#diagnosticImpression').val() === '') {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return false;
        }

        let hasSelectedCode = false;
        $('#reportForm tbody tr').each(function () {
            if ($(this).find('select').val() !== '') {
                hasSelectedCode = true;
                return false;
            }
        });

        if (!hasSelectedCode) {
            alert('Por favor, selecione um código para pelo menos um órgão.');
            return false;
        }

        return true;
    }
}
