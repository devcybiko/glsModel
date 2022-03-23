glsModel = {
    load(url) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                var gls = JSON.parse(this.responseText);
                glsModel.display(gls);
            }
        };
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
    },
    makeHTML(model) {
        let html = "<model-viewer ";
        html += `onclick="glsModel.click('${model.id}');" `;
        let skip = ["control-index", "div"]
        for (let key of Object.keys(model)) {
            if (skip.indexOf(key) >= 0) continue;
            html += `${key}="${model[key]}" `;
        }
        html += "></model-viewer>";
        return html;
    },
    display(gls) {
        let model = gls['model-viewer'];
        let divName = model.div;
        let html = glsModel.makeHTML(model);
        let div = document.querySelector(divName) || document.querySelector("#" + divName);
        div.innerHTML = html;
        glsModel.setModelData(gls, model.id);
    },
    error(msg) {
        throw new Error(...arguments);
    },
    log(msg) {
        // console.error(...arguments);
    },
    setModelData(gls, id) {
        glsModel["$" + id] = gls;
    },
    getModelData(id) {
        return glsModel["$" + id];
    },
    assert(value, msg) {
        if (!value) error(msg);
        return value;
    },
    click(id) {
        let x = event.x;
        let y = event.y;
        let material = null;
        let secretTag = null;
        let name = null;

        let gls = glsModel.assert(glsModel.getModelData(id), "could not find gls object: " + id);
        glsModel.unflash(gls); // see warning below

        let modelViewer = glsModel.assert(document.querySelector(id) || document.querySelector("#" + id), "Unknown model-viewer: " + id);
        let div = modelViewer.shadowRoot.querySelector(".userInput");
        if (div) div.style.cursor = "pointer";
        if (modelViewer.materialFromPoint) material = modelViewer.materialFromPoint(x, y); // see warning below
        if (material) { 
            name = material.name;
            console.log("material.name:", name);       
            let controlIndex = gls["model-viewer"]["control-index"];
            if (controlIndex) {
                let bcf = glsModel.assert(material.pbrMetallicRoughness.baseColorFactor, "Could not find baseColorFactor: " + id);
                secretTag = Number(bcf[controlIndex].toFixed(2));    
            }
        }
        return glsModel.actionGO(gls, modelViewer, material, secretTag, name); 
    },
    actionGO(gls, modelViewer, material, secretTag, name) {
        let mapping = gls["mapping"];
        let action = mapping[name] || mapping["" + secretTag];
        if (!action) action = mapping["default"];
        let actionFunction = glsModel[action.action + "Action"];
        if (actionFunction) actionFunction({ modelViewer, material, gls, action, name });
    },
    unflash(gls) {
        if (gls.lastBCF) {
            gls.lastMaterial.pbrMetallicRoughness.setBaseColorFactor(gls.lastBCF);
            gls.lastBCF = null;
        }
    },
    flash(args) {
        let gls = args.gls;
        let action = args.action;
        let material = args.material;
        let color = gls.colors[action.color];
        if (material && color) {
            gls.lastBCF = material.pbrMetallicRoughness.baseColorFactor;
            material.pbrMetallicRoughness.setBaseColorFactor(color);
            gls.lastMaterial = material;
        }
    },
    updateAction(args) {
        glsModel.flash(args);
        let div = document.querySelector(args.action.div) || document.querySelector("#" + args.action.div);
        div.innerHTML = args.action.html;
    },
    debugAction(args) {
        console.log({args});
        glsModel.flash(args);
        let div = document.querySelector(args.action.div) || document.querySelector("#" + args.action.div);
        div.innerHTML = args.name || "null";
    },
    errorAction(args) {
        glsModel.flash(args);
        let div = document.querySelector(args.action.div) || document.querySelector("#" + args.action.div);
        div.innerHTML = `<p style='color:red'>ERROR: ${args.name}</p>`;
    }
}
/**
 * DANGER, WARNING WILL ROBINSON
 * The gls.lastMaterial points to the last material that was clicked.
 * Every time you call `modelViewer.materialFromPoint`
 * you get THE SAME OBJECT BACK!
 * But with new values inside.
 * So, the call above to glsModel.unflash() MUST be called immediately
 * and well before modelViewer.materialFromPoint is called. Otherwise,
 * the original `material` will not be restored.
 * You have been warned.
 */