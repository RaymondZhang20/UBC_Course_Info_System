document.getElementById("courses_anchor").addEventListener("click", showCourses);
document.getElementById("rooms_anchor").addEventListener("click", showRooms);
document.getElementById("submit_button").addEventListener("click", searchAvg);
document.getElementById("avgByYear_button").addEventListener("click", avgByYear);
document.getElementById("avgByInstr_button").addEventListener("click", avgByInstructor);
document.getElementById("courses_section").style.display = "none";
getYearPopulateDropdown();
let course_state = 0;

function avgByYear() {
	course_state = 1;
	document.getElementById("year_label").style = "color: black";
	document.getElementById("year").removeAttribute("disabled");
	document.getElementById("instr").setAttribute("disabled", "");
	document.getElementById("submit_button").removeAttribute("disabled");
}

function avgByInstructor() {
	course_state = 2;
	document.getElementById("year_label").style = "color: darkgray";
	document.getElementById("year").setAttribute("disabled", "");
	document.getElementById("instr").removeAttribute("disabled");
	document.getElementById("submit_button").removeAttribute("disabled");
}



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
	if (course_state === 1) {
		searchAvgByYear();
	} else if (course_state === 2) {
		searchAvgByInstr();
	}
}

function searchAvgByInstr() {
	document.getElementById("courses_result").innerHTML = "";
	const dept = document.getElementById("dept").value;
	const id = document.getElementById("id").value;
	const instr = document.getElementById("instr").value;
	if (!(dept && id && instr)) {
		alert("Missing information");
		return;
	}
	let query = {
		WHERE:{
			AND: [
				{
					IS: {
						sections_id: `${id}`
					}
				},
				{
					IS: {
						sections_dept: `${dept}`
					}
				},
				{
					IS: {
						sections_instructor: "*" + `${instr}` + "*"
					}
				}
			]
		},
		"OPTIONS": {
			"COLUMNS": [
				"sections_instructor",
				"overallAvg"
			]
		},
		"TRANSFORMATIONS": {
			"GROUP": [
				"sections_id",
				"sections_dept",
				"sections_instructor"
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
	const Http = new XMLHttpRequest();
	const url='http://localhost:4321/query';
	Http.open("POST", url);
	Http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	Http.send(JSON.stringify(query));

	Http.onreadystatechange = (e) => {
		if (Http.readyState === Http.DONE) {
			let response = JSON.parse(Http.response)["result"];
			if (response.length === 0) {
				alert("The course doesn't exist or there is no instructor match with the name");
				return;
			}
			let list = "";
			const instructors = [];
			for (ele of response) {
				list += "<li class=\"list-group-item d-flex justify-content-between align-items-start\">\n" +
					"    <div class=\"ms-2 me-auto\">\n" +
					"      <div class=\"fw-bold\">" + `${ele["sections_instructor"]}` + "</div>\n" +
					dept + id + " average for the instructor is: " + `${ele["overallAvg"]}` +
					"    </div>\n" +
					"    <span class=\"badge bg-primary rounded-pill\">" + `${ele["overallAvg"]}` + "</span>\n" +
					"  </li>\n"
				instructors.push(ele["sections_instructor"]);
			}
			alert("there are " + instructors.length + " instructors match with \'" + instr + "\'");
			const result = document.createElement("ol");
			result.setAttribute("class", "list-group");
			result.innerHTML = list;
			document.getElementById("courses_result").appendChild(result);
		}
	}
}

function searchAvgByYear() {
	document.getElementById("courses_result").innerHTML = "";
	const dept = document.getElementById("dept").value;
	const id = document.getElementById("id").value;
	const years = Array.from(document.getElementById("year").selectedOptions).map(v=>v.value);
	if (!(dept && id && years.length>0)) {
		alert("Missing information");
		return;
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
		if (Http.readyState === Http.DONE) {
			let response = JSON.parse(Http.response)["result"];
			if (response.length === 0) {
				alert("The course doesn't exist");
				return;
			}
			const result = document.createElement("h2");
			result.textContent = "The over all average of " + dept + id + " through out the specific years is: " + response[0]["overallAvg"];
			document.getElementById("courses_result").appendChild(result);
		}
	}
}
