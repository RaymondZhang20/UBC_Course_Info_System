document.getElementById("courses_anchor").addEventListener("click", showCourses);
document.getElementById("rooms_anchor").addEventListener("click", showRooms);
document.getElementById("submit_button").addEventListener("click", searchAvg);
document.getElementById("courses_section").style.display = "none";

function showCourses() {
	// document.getElementById("courses_anchor").classList.replace("nav-link px-2 link-secondary", "nav-link px-2 dark");
	document.getElementById("home_section").style.display = "none";
	document.getElementById("courses_section").style.display = "block";
	document.getElementById("courses_anchor").setAttribute("class", "nav-link px-2 link-dark");
	document.getElementById("rooms_anchor").setAttribute("class", "nav-link px-2 link-secondary");
}

function showRooms() {
	alert("Not implemented yet!");
}

function searchAvg() {
	const dept = document.getElementById("dept").value;
	const id = document.getElementById("id").value;
	const years = Array.from(document.getElementById("year").selectedOptions).map(v=>v.value);
	if (!(dept && id && years)) {
		alert("Missing information");
	}
	const yearQuery = [];
	for (let year of years) {
		yearQuery.push({
			EQ: {
				sections_year: parseInt(`${year}`)
			}
		});
	}
	let query = {
		WHERE:{
			AND: [
				{
					OR: []
				},
				{
					IS: {
						sections_id: `${id}`
					}
				},
				{
					IS: {
						sections_dept: `${dept}`
					}
				}
			]
		},
		"OPTIONS": {
			"COLUMNS": [
				"overallAvg"
			]
		},
		"TRANSFORMATIONS": {
			"GROUP": [
				"sections_id",
				"sections_dept"
			],
			"APPLY": [
				{
					"overallAvg": {
						"AVG": "sections_avg"
					}
				}
			]
		}
	};
	query["WHERE"]["AND"][0]["OR"].push(...yearQuery);
	const Http = new XMLHttpRequest();
	const url='http://localhost:4321/query';
	Http.open("POST", url);
	Http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	Http.send(JSON.stringify(query));

	Http.onreadystatechange = (e) => {
		let response = Http.responseText;
		let object = JSON.parse(response);
		console.log(object);
	}
}
