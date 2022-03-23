for (let i=1; i<20; i++) {
    let a = "" + i;
    a = a.padStart(3, "0");
    let s = `"Material.${a}": {
        "action": "update",
        "html": "<h1>Material.${a}</h1>",
        "color": "red",
        "div": "#AT1K02_JOB_2_output"
    },
`;
    console.log(s);
}