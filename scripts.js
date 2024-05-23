const baseURL = '/orthanc';
const itemsPerPage = 10; // Number of items to fetch per request
let currentPage = 1; // Start with the first page

async function fetchFromOrthanc(endpoint) {
    try {
        const response = await fetch(`${baseURL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic YWRhbXM6YWRhbXMxMjM=',
                'Content-Type': 'application/json',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
            }
        });

        if (!response.ok) {
            throw new Error(`Error in request: ${response.status} - ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch from Orthanc: ${endpoint}`, error);
        throw error; // Rethrow the error to be caught by the calling function
    }
}

async function getStudiesList(page, limit) {
    return await fetchFromOrthanc(`/studies?limit=${limit}&since=${(page - 1) * limit}`);
}

async function getStudyDetails(studyId) {
    return await fetchFromOrthanc(`/studies/${studyId}`);
}

async function processStudies(page = 1, limit = itemsPerPage) {
    try {
        showLoadingIndicator();
        disablePagination();

        const studies = await getStudiesList(page, limit);
        if (!studies || studies.length === 0) {
            showNoResultsMessage();
            return;
        }

        const fetchStudyDetailsPromises = studies.map(studyId => getStudyDetails(studyId));
        const studiesDetails = await Promise.all(fetchStudyDetailsPromises);

        const processedStudies = studiesDetails.map(studyDetails => {
            if (studyDetails) {
                const mainTags = studyDetails.MainDicomTags;
                const patientTags = studyDetails.PatientMainDicomTags;

                return {
                    patientId: patientTags.PatientID || 'Unknown',
                    patientName: patientTags.PatientName ? patientTags.PatientName.replace(/^(\^)+/, '') : 'Unknown',
                    studyDescription: mainTags.StudyDescription || 'N/A',
                    studyDate: mainTags.StudyDate ? formatDate(mainTags.StudyDate) : 'Unknown',
                    referringPhysicianName: mainTags.ReferringPhysicianName || 'N/A'
                };
            } else {
                console.error(`Failed to fetch details for studyId: ${studyId}`);
                return null;
            }
        }).filter(study => study !== null);

        displayStudies(processedStudies, page, limit);
    } catch (error) {
        console.error(error);
        showErrorMessage('Error processing studies. Please try again.');
    } finally {
        hideLoadingIndicator();
        enablePagination();
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    return `${day}/${month}/${year}`;
}

function displayStudies(studies, page, limit) {
    const studiesTable = document.getElementById('examsTable').getElementsByTagName('tbody')[0];
    studiesTable.innerHTML = '';

    const fragment = document.createDocumentFragment();

    studies.forEach(study => {
        const row = document.createElement('tr');

        insertCell(row, study.patientId);
        insertCell(row, study.patientName);
        insertCell(row, study.studyDescription);
        insertCell(row, study.studyDate);
        insertCell(row, study.referringPhysicianName);

        insertButton(row, '📄', () => viewReport(study));
        insertButton(row, '✏️', () => editMetadata(study));
        insertButton(row, '🔗', () => shareStudy(study));

        fragment.appendChild(row);
    });

    studiesTable.appendChild(fragment);

    updatePagination(page, limit, studies.length);
}

function insertCell(row, text) {
    const cell = row.insertCell();
    cell.textContent = text;
}

function insertButton(row, icon, action) {
    const cell = row.insertCell();
    const button = document.createElement('button');
    button.innerHTML = icon;
    button.onclick = action;
    cell.appendChild(button);
}

function updatePagination(page, limit, totalItems) {
    const pageNumber = document.getElementById('pageNumber');
    const totalPages = Math.ceil(totalItems / limit);
    pageNumber.textContent = `Page ${page} of ${totalPages}`;

    const prevPage = document.getElementById('prevPage');
    prevPage.disabled = page === 1;

    const nextPage = document.getElementById('nextPage');
    nextPage.disabled = page === totalPages;
}

function nextPage() {
    currentPage++;
    processStudies(currentPage, itemsPerPage);
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        processStudies(currentPage, itemsPerPage);
    }
}

function filterTable() {
    const searchInput = document.getElementById('search').value.toLowerCase();
    const tableRows = document.getElementById('examsTable').getElementsByTagName('tbody')[0].getElementsByTagName('tr');

    for (let row of tableRows) {
        const cells = row.getElementsByTagName('td');
        let matches = false;
        for (let cell of cells) {
            if (cell.textContent.toLowerCase().includes(searchInput)) {
                matches = true;
                break;
            }
        }
        row.style.display = matches ? '' : 'none';
    }
}

function viewReport(study) {
    alert(`View report for patient: ${study.patientName}`);
}

function editMetadata(study) {
    alert(`Edit metadata for study of patient: ${study.patientName}`);
}

function shareStudy(study) {
    alert(`Share study of patient: ${study.patientName}`);
}

function showLoadingIndicator() {
    // Add code to display a loading indicator
}

function hideLoadingIndicator() {
    // Add code to hide the loading indicator
}

function disablePagination() {
    document.getElementById('prevPage').disabled = true;
    document.getElementById('nextPage').disabled = true;
}

function enablePagination() {
    document.getElementById('prevPage').disabled = false;
    document.getElementById('nextPage').disabled = false;
}

function showNoResultsMessage() {
    const studiesTable = document.getElementById('examsTable').getElementsByTagName('tbody')[0];
    studiesTable.innerHTML = '<tr><td colspan="8">No studies found.</td></tr>';
}

function showErrorMessage(message) {
    // Add code to display the error message to the user
}

document.addEventListener('DOMContentLoaded', () => processStudies(currentPage, itemsPerPage));
