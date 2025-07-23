
const Status = {
    PLANING: "planning",
    DEVELOPMENT: "development",
    SQA: "sqa",
    DEPLOYMENT: "deployment"
};

class Task {
    constructor(title, desc, currentStatus) {
        const safeTitle = title.replace(/\s+/g, "-").toLowerCase();
        this.id = `${currentStatus}-${safeTitle}`;
        this.title = title;
        this.desc = desc;
        this.status = currentStatus;
    }

    updateTitle(newTitle) {
        this.title = newTitle;
    }

    updateDesc(newDesc) {
        this.desc = newDesc;
    }

    updateStatus(newStatus) {
        if (Object.values(Status).includes(newStatus)) {
            this.status = newStatus;
        } else {
            throw new Error(`Invalid status: ${newStatus}`);
        }
    }
}

class Trello {
    constructor() {
        this.planning = [];
        this.development = [];
        this.sqa = [];
        this.deployment = [];
        this.getDataFromLocal();
    }

    initialize() {
        Object.values(Status).forEach(status => {
            const tasks = trello[status];
            let html = `<div class="accordion p-2 border rounded bg-light" id="${status}-accordion">`;

            tasks.forEach(task => {
                html += designedCard(task);
            });

            html += "</div>";

            $("#" + status).html(html);
        });

        $("[id^='card-']").draggable({
            revert: true,
            start: function () {
                $(this).addClass('z-2');
            }

        });

        Object.values(Status).forEach(status => {
            $("#" + status).droppable({
                accept: ".accordion-item",
                drop: function (event, ui) {
                    const taskId = ui.helper.data("id");
                    let task = null;

                    for (const st of Object.values(Status)) {
                        task = trello[st].find(t => t.id === taskId);
                        if (task) break;
                    }

                    if (task && task.status !== status) {
                        trello.updateTask(task, { status: status });
                    }
                }
            });
        });
    }

    saveData() {
        localStorage.setItem("trelloData", JSON.stringify(this));
    }

    getDataFromLocal() {
        const localData = JSON.parse(localStorage.getItem("trelloData"));
        if (!localData) return;

        this.planning = localData.planning.map(t => new Task(t.title, t.desc, t.status));
        this.development = localData.development.map(t => new Task(t.title, t.desc, t.status));
        this.sqa = localData.sqa.map(t => new Task(t.title, t.desc, t.status));
        this.deployment = localData.deployment.map(t => new Task(t.title, t.desc, t.status));
    }

    addTask(task) {
        if (this[task.status]) {
            this[task.status].push(task);
            this.initialize();
            this.saveData();
        } else {
            throw new Error(`Invalid status group: ${task.status}`);
        }
    }

    deleteTask(taskId) {
        for (const status of Object.values(Status)) {
            const index = this[status].findIndex(task => task.id === taskId);
            if (index !== -1) {
                this[status].splice(index, 1);
                return true;
            }
        }
        return false;
    }

    updateTask(task, updatedFields) {
        const originalStatus = task.status;

        if (updatedFields.title) task.updateTitle(updatedFields.title);
        if (updatedFields.desc) task.updateDesc(updatedFields.desc);

        if (updatedFields.status && updatedFields.status !== originalStatus) {
            this.deleteTask(task.id);
            task.updateStatus(updatedFields.status);
            this.addTask(task);
        } else {
            this.initialize();
            this.saveData();
        }
    }
}



function designedCard(task) {
    return `
       <div id="card-${task.id}" class="accordion-item bg-white border rounded shadow-sm mb-3" data-id="${task.id}">
            <h2 class="accordion-header" id="heading-${task.id}">
                <div class="accordion-button collapsed bg-light text-dark d-flex justify-content-between align-items-center no-click-drag"
                     data-bs-toggle="collapse"
                     data-bs-target="#collapse-${task.id}"
                     aria-expanded="false"
                     aria-controls="collapse-${task.id}">
                    <span>${task.title}</span>
                </div>
            </h2>
            <div id="collapse-${task.id}" class="accordion-collapse collapse"
                 aria-labelledby="heading-${task.id}">
                <div class="accordion-body">
                    <p class="mb-3 text-secondary">${task.desc || "No description provided."}</p>
                    
                    <div class="mb-3">
                        <label for="status-${task.id}" class="form-label">Status</label>
                        <select class="form-select form-select-sm status-select"
                                id="status-${task.id}"
                                data-title="${task.title}">
                            <option value="planning" ${task.status === 'planning' ? 'selected' : ''}>Planning</option>
                            <option value="development" ${task.status === 'development' ? 'selected' : ''}>Development</option>
                            <option value="sqa" ${task.status === 'sqa' ? 'selected' : ''}>SQA</option>
                            <option value="deployment" ${task.status === 'deployment' ? 'selected' : ''}>Deployment</option>
                        </select>
                    </div>

                    <div class="d-flex justify-content-between">
                        <button id="delete-${task.id}" class="btn btn-sm btn-outline-danger delete-btn" data-title="${task.title}">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}



const trello = new Trello();
trello.initialize();

// Add task
$("#add-button").click((e) => {
    e.preventDefault();

    const title = $("#add-title").val();
    const desc = $("#add-desc").val();
    const status = $("#add-status").val();

    if (title && desc) {
        trello.addTask(new Task(title, desc, status));
        $("#add-title").val('');
        $("#add-desc").val('');
    }
});

// Status change
$(document).on("change", "[id^='status']", (event) => {
    const fullSelectId = $(event.target).attr("id");
    const taskId = fullSelectId.replace("status-", "");
    const newStatus = $(event.target).val();

    let task = null;

    for (const status of Object.values(Status)) {
        task = trello[status].find(t => t.id === taskId);
        if (task) break;
    }

    if (task) {
        trello.updateTask(task, { status: newStatus });
    }
});

// Delete task
$(document).on("click", "[id^='delete']", (event) => {
    const fullButtonId = $(event.target).attr("id");
    const taskId = fullButtonId.replace("delete-", "");

    const deleted = trello.deleteTask(taskId);
    if (deleted) {
        trello.initialize();
        trello.saveData();
    }
});
