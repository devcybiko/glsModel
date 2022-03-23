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
        for(let key of Object.keys(model)) {
            if (skip.indexOf(key) >= 0) continue;
            html += `${key}="${model[key]}" `;
        }
        html += "></model-viewer>";
        return html;
    },
    display(gls) {
        glsModel.log(gls);
        let model = gls['model-viewer'];
        glsModel.log(model);

        let divName = model.div;
        let html = glsModel.makeHTML(model);
        glsModel.log(html);
        let div = document.querySelector(divName) || document.querySelector("#" + divName);
        div.innerHTML = html;
        glsModel["$" + model.id] = gls;
    },
    error(msg) {
        throw new Error(...arguments);
    },
    log(msg) {
        // console.error(...arguments);
    },
    click(id) {
        let x = event.x;
        let y = event.y;
        let gls = glsModel["$" + id];
        console.log(id, {x, y}, {gls}, {event});
        glsModel.unflash(gls);

        if (!gls) return glsModel.error("could not find gls object: " + id);
        let model = gls["model-viewer"];
        let mapping = gls["mapping"];
        let controlIndex = model["control-index"];

        let modelViewer = document.querySelector(id) || document.querySelector("#" + id);
        if (!modelViewer) return glsModel.error("Unknown model-viewer: " + id);

        let div = modelViewer.shadowRoot.querySelector(".userInput");
        if (div) div.style.cursor = "pointer";

        let material = null;
        if (modelViewer.materialFromPoint) {
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
         material = modelViewer.materialFromPoint(x, y);
        }
        if (!material) {
            let obj = mapping["null"];
            let actionFunction = glsModel[obj.action+"Action"];
            if (actionFunction) actionFunction({modelViewer, material, gls, obj});
            return;
        }
        let name = material.name;
        console.log("material.name:", name);

        let bcf = material.pbrMetallicRoughness.baseColorFactor;
        if (!bcf) return glsModel.error("Could not find baseColorFactor: " + id);

        let obj = mapping[name];
        if (!obj) {
            let c = ""+ Number(bcf[controlIndex].toFixed(2));
            obj = mapping[c];
        }
        if (!obj) {
            let obj = mapping["error"];
            if (obj) {
                let actionFunction = glsModel[obj.action+"Action"];
                actionFunction({modelViewer, material, gls, obj});            
            }
            return glsModel.error("Problem parsing the name: " + name + " or secret number: " + c);
        }
            if (obj) {
            }
        }
        let actionFunction = glsModel[obj.action+"Action"];
        if (actionFunction) actionFunction({modelViewer, material, gls, obj});
    },
    unflash(gls) {
        if (gls.lastBCF) {
            gls.lastMaterial.pbrMetallicRoughness.setBaseColorFactor(gls.lastBCF);
            gls.lastBCF = null;
        }
    },
    flash(args) {
        let gls = args.gls;
        let obj = args.obj;
        if (!obj) return;
        let material = args.material;
        if (!material) return;
        if (material) {
            let color = gls.colors[obj.color];
            gls.lastBCF = material.pbrMetallicRoughness.baseColorFactor;
            material.pbrMetallicRoughness.setBaseColorFactor(color);
            gls.lastMaterial = material;
        }
    },
    updateAction(args) {
        glsModel.flash(args);
        let div = document.querySelector(args.obj.div) || document.querySelector("#" + args.obj.div);
        div.innerHTML = args.obj.html;
    },
    debugAction(args) {
        glsModel.flash(args);
        let div = document.querySelector(args.material.div) || document.querySelector("#" + args.obj.div);
        div.innerHTML = args.material.name;
    },
    errorAction(args) {
        glsModel.flash(args);
        let div = document.querySelector(args.obj.div) || document.querySelector("#" + args.obj.div);
        div.innerHTML = `<p style='color:red'>ERROR: ${args.material.name}</p>`;
    }
}