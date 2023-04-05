document.getElementById("courses_anchor").addEventListener("click", showCourses);
document.getElementById("rooms_anchor").addEventListener("click", showRooms);
document.getElementById("submit_button").addEventListener("click", searchAvg);
document.getElementById("courses_section").style.display = "none";
getYearPopulateDropdown();

function getYearPopulateDropdown(){
	const getYearQuery = {
		"WHERE":{
		},
		"OPTIONS": {
			"COLUMNS": [
				"sections_year"
			]
		},
		"TRANSFORMATIONS": {
			"GROUP": [
				"sections_year"
			],
			"APPLY": [
			]
		}
	};
	const Http1 = new XMLHttpRequest();
	const url1='http://localhost:4321/query';
	Http1.open("POST", url1);
	Http1.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	Http1.send(JSON.stringify(getYearQuery));
	let yearArray = [];
	Http1.onreadystatechange = (e) => {
		let yearArraySort;
		if (Http1.readyState === Http1.DONE) {
			let response = Http1.responseText;
			console.log(response);
			let object = JSON.parse(response);
			console.log(object);
			object["result"].forEach((element) => {
				yearArray.push(element["sections_year"])
			})
			yearArraySort = yearArray.sort()
			let select = document.getElementById("year");
			for (let i = 0; i < yearArraySort.length; i++) {
				let opt = yearArraySort[i];
				select.innerHTML += "<option value=\"" + opt + "\">" + opt + "</option>";
			}
		}
	}
	// console.log(yearArray);
}
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
	console.log(query)
	const Http = new XMLHttpRequest();
	const url='http://localhost:4321/query';
	Http.open("POST", url);
	Http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	Http.send(JSON.stringify(query));

	Http.onreadystatechange = (e) => {
		if (Http.readyState === Http.DONE){
			let response = Http.responseText;
			console.log(response);
		}
	}
}
