import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import DataBase from "./model/DataBase";
import * as fs from "fs-extra";
import JSZip from "jszip";
import Section from "./model/Section";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private dataBases: DataBase[] = [];

	constructor() {
		fs.exists("./DataBases.json", (exist) => {
			if (exist) {
				fs.readFile("./DataBases.json").then((buffer) => {
					this.dataBases = JSON.parse(buffer.toString());
				});
			}
		});
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (id.includes("_")) {
			return Promise.reject(new InsightError("id of the database should not contain underscore"));
		} else if (this.onlySpace(id)) {
			return Promise.reject(new InsightError("id of the database should not be only whitespace characters"));
		} else if (this.idDuplicate(id)) {
			return Promise.reject(new InsightError("id of the database is already existed"));
		} else {
			if (kind === InsightDatasetKind.Sections) {
				const sections: Section[] = [];
				return this.parse(content)
					.then((infoArray) => {
						infoArray.forEach(function (s) {
							const info: any[] = JSON.parse(s).result;
							if (info.length > 0) {
								info.forEach(function (section) {
									sections.push(new Section(section.id, section.Course, section.Title
										, section.Professor
										, section.Subject, section.Year, section.Avg, section.Pass
										, section.Fail, section.Audit));
								});
							}
						});
						this.dataBases.push(new DataBase(id, sections));
						return this.listIDs();
					})
					.catch((err) => {
						return Promise.reject(new InsightError("error occurred in adding stage"));
					});
			} else if (kind === InsightDatasetKind.Rooms) {
				return Promise.reject(new InsightError("not implemented yet"));
			} else {
				return Promise.reject(new InsightError("kind of the database is not valid"));
			}
		}
	}

	public listDatasets(): Promise<InsightDataset[]> {
		const res: InsightDataset[] = [];
		this.dataBases.forEach(function (database) {
			res.push({
				id: database.getId(),
				kind: InsightDatasetKind.Sections,
				numRows: database.getList().length
			});
		});
		return Promise.resolve(res);
	}

	public removeDataset(id: string): Promise<string> {
		for (let i = 0; i < this.dataBases.length; i++) {
			if (this.dataBases[i].getId() === id) {
				this.dataBases.splice(i, 1);
				return Promise.resolve(id);
			}
		}
		return Promise.reject(new NotFoundError("Cannot find the dataBase"));
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		if (!query){
			return Promise.reject(new InsightError("Query is undefined/null/empty"));
		// }(typeof query === "undefined") {
		// 	return Promise.reject(new InsightError("Query is undefined"));
		}else if (fs.existsSync("./DataBases.json")) {
			return Promise.reject(new InsightError("No loaded datasets"));
		}
		this.queryProcessor(query);
		return Promise.reject("Not implemented.");
	}

	private listIDs(): string[] {
		const res: string[] = [];
		this.dataBases.forEach(function (da) {
			res.push(da.getId());
		});
		return res;
	}

	private containUnderscore(id: string) {
		return id.includes("_");
	}

	private onlySpace(id: string) {
		for (const char of id) {
			if (char !== " ") {
				return false;
			}
		}
		return true;
	}

	private idDuplicate(id: string) {
		for (const dataBase of this.dataBases) {
			if (dataBase.getId() === id) {
				return true;
			}
		}
		return false;
	}

	private async parse(content: string): Promise<string[]> {
		const coursesArray: any[] = [];
		try {
			const zip = await new JSZip().loadAsync(content, {base64: true});
			zip.folder("courses/")?.forEach((path, file) => {
				coursesArray.push(file.async("string"));
			});
		} catch (e: any) {
			return Promise.reject(new InsightError("error occurred in parsing stage: " + e.getMessage()));
		}
		return Promise.all(coursesArray);
		// return new JSZip().loadAsync(content, {base64: true}).then((jsZip) => {
		// 	jsZip.folder("courses/")?.forEach((path, file) => {
		// 		info.push(file.async("string"));
		// 	});
		// 	return Promise.all(info);
		// }).catch((err) => {
		// 	return Promise.reject(new InsightError("error occurred in parsing stage"));
		// });
	}

	private queryProcessor(query: any){
		if (query.includes("WHERE") && query.includes("OPTIONS")) {
			const whereBody = query["WHERE"];
			const optionsBody =  query["OPTIONS"];
			if (whereBody) {
				this.handleWhere(whereBody);
			} else{
				return Promise.reject(new InsightError("Null WHERE"));
			}
			if (optionsBody){
				this.handleOptions(optionsBody);
			}else{
				return Promise.reject(new InsightError("null OPTIONS"));
			}
		}else{
			return Promise.reject(new InsightError ("Invalid query missing WHERE/OPTIONS"));
		}
	}

	private handleWhere(whereBody: any){
		const comparator = whereBody[0];
		if (comparator === "IS"){
			return Promise.reject("Not implemented.");
		}
		if (comparator === "NOT"){
			return Promise.reject("Not implemented.");
		}
		if (comparator === "AND"){
			return Promise.reject("Not implemented.");
		}
		if (comparator === "OR"){
			return Promise.reject("Not implemented.");
		}
		if (comparator === "EQ" || comparator ===  "GT" || comparator === "LT"){
			if (comparator === "EQ") {
				return this.helperEQ(whereBody);
			} else if (comparator === "GT") {
				return this.helperGT(whereBody);
			}else if (comparator === "LT") {
				return this.helperLT(whereBody);
			}
		}

	}

	private helperEQ(whereBody: any){
		return Promise.reject("Not implemented.");
	}
	private helperGT(whereBody: any){
		return Promise.reject("Not implemented.");
	}
	private helperLT(whereBody: any){
		return Promise.reject("Not implemented.");
	}
	private handleOptions(optionsBody: any){
		return Promise.reject("Not implemented.");
	}

	// private parse(content: string): Promise<string[]> {
	// 	const dataset: any[] = [];
	// 	return new JSZip().loadAsync(content, {base64: true}).then((jsZip) => {
	// 		jsZip.folder("courses/")?.forEach((path, file) => {
	// 			file.async("string").then((s) => {
	// 				dataset.push(s);
	// 			});
	// 		});
	// 	}).then(() => {
	// 		return Promise.all(dataset);
	// 	}).catch((err) => {
	// 		return Promise.reject(new InsightError("error occurred in parsing stage"));
	// 	});
	// }
}
