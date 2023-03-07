import JSZip from "jszip";
import {InsightError} from "../IInsightFacade";
import {parse} from "parse5";
import http from "http";
import Room from "./Room";

export class DatabaseHelpers {
	protected async parseSection(content: string): Promise<string[]> {
		const coursesArray: any[] = [];
		try {
			const zipLoaded = await new JSZip().loadAsync(content, {base64: true});
			zipLoaded.folder("courses/")?.forEach((path, file) => {
				coursesArray.push(file.async("string"));
			});
		} catch (e: any) {
			return Promise.reject(new InsightError("error occurred in parsing stage: " + e.getMessage()));
		}
		return Promise.all(coursesArray);

	}

	protected async parseRoom(content: string): Promise<any[]> {
		const buildingInfoArray: any[] = [];
		const roomInfoArray: any[] = [];
		try {
			const zipLoaded = await new JSZip().loadAsync(content, {base64: true});
			if (zipLoaded.file("index.htm")?.name === undefined) {
				throw new InsightError("no index file");
			}
			const index: any = await zipLoaded.file("index.htm")?.async("string");
			const buildingTBody: any = this.findTBody(parse(index));
			for (let node of buildingTBody.childNodes) {
				if (node["nodeName"] === "tr") {
					let classValue: string;
					const buildingInfo: any = {};
					for (let subNode of node.childNodes) {
						if (subNode["nodeName"] === "td") {
							classValue = subNode["attrs"][0]["value"];
							switch (classValue) {
								case "views-field views-field-field-building-code":
									buildingInfo["shortname"] = subNode.childNodes[0]["value"].trim();
									break;
								case "views-field views-field-title":
									buildingInfo["link"] = subNode.childNodes[1]["attrs"][0]["value"].trim().slice(2);
									buildingInfo["fullname"] = subNode.childNodes[1].childNodes[0]["value"].trim();
									break;
								case "views-field views-field-field-building-address":
									buildingInfo["address"] = subNode.childNodes[0]["value"].trim();
									break;
							}
						}
					}
					buildingInfoArray.push(buildingInfo);
				}
			}
			await this.getLocation(buildingInfoArray);
			await this.addRoomInfo(buildingInfoArray, zipLoaded, roomInfoArray);
		} catch (e: any) {
			return Promise.reject(new InsightError("error occurred in parsing stage: " + e.getMessage()));
		}
		return Promise.all(roomInfoArray);

	}

	protected findTBody(node: any): any {
		if (node["attrs"] !== undefined) {
			for (let attrs of node["attrs"]) {
				if (attrs["name"] === "class" && attrs["value"] === "views-table cols-5 table") {
					for (let childNode of node.childNodes) {
						if (childNode["nodeName"] === "tbody") {
							return childNode;
						}
					}
				}
			}
		}
		if (node.childNodes !== undefined) {
			for (let childNode of node.childNodes) {
				if (this.findTBody(childNode) !== undefined) {
					return this.findTBody(childNode);
				}
			}
		}
		return undefined;
	}

	protected getLocation(buildingInfoArray: any[]) {
		const flag: any[] = [];
		buildingInfoArray.forEach((buildingInfo: any) => {
			flag.push(new Promise((res, rej)=>{
				try {
					http.get("http://cs310.students.cs.ubc.ca:11316/api/v1/project_team106/"
						+ buildingInfo["address"].replaceAll(" ", "%20"), (result) => {
						let data: any[] = [];
						result.on("data", (chunk) => {
							data.push(chunk);
						}).on("end", () => {
							const GEOlocation = JSON.parse(Buffer.concat(data).toString());
							buildingInfo["lat"] = GEOlocation["lat"];
							buildingInfo["lon"] = GEOlocation["lon"];
							return res(true);
						});
					});
				} catch (err) {
					rej(err);
				};
			}));
		});
		return Promise.all(flag);
	}

	protected addRoomInfo(buildingInfoArray: any[], zipLoaded: JSZip, roomInfoArray: any[]) {
		const flag: any[] = [];
		buildingInfoArray.forEach((buildingInfo: any) => {
			if (zipLoaded.file(buildingInfo["link"])?.name === undefined) {
				throw new InsightError("no building file");
			}
			flag.push(new Promise((res, rej) => {
				zipLoaded.file(buildingInfo["link"])?.async("string").then((buildingHtm: any) => {
					const roomTBody: any = this.findTBody(parse(buildingHtm));
					if (roomTBody === undefined) {
						return res(false);
					}
					for (let node of roomTBody.childNodes) {
						if (node["nodeName"] === "tr") {
							let classValue: string;
							const roomInfo: any = {};
							roomInfo["fullname"] = buildingInfo["fullname"];
							roomInfo["shortname"] = buildingInfo["shortname"];
							roomInfo["address"] = buildingInfo["address"];
							roomInfo["lat"] = buildingInfo["lat"];
							roomInfo["lon"] = buildingInfo["lon"];
							for (let subNode of node.childNodes) {
								if (subNode["nodeName"] === "td") {
									classValue = subNode["attrs"][0]["value"];
									switch (classValue) {
										case "views-field views-field-field-room-number":
											roomInfo["href"] = subNode.childNodes[1]["attrs"][0]["value"].trim();
											roomInfo["number"] = subNode.childNodes[1].childNodes[0]["value"].trim();
											break;
										case "views-field views-field-field-room-capacity":
											roomInfo["seats"] = subNode.childNodes[0]["value"].trim();
											break;
										case "views-field views-field-field-room-furniture":
											roomInfo["furniture"] = subNode.childNodes[0]["value"].trim();
											break;
										case "views-field views-field-field-room-type":
											roomInfo["type"] = subNode.childNodes[0]["value"].trim();
											break;
									}
								}
							}
							roomInfoArray.push(roomInfo);
						}
					}
					return res(true);
				});
			}));
		});
		return Promise.all(flag);
	}

	protected loadRooms(infoArray: any[], rooms: Room[]) {
		if (infoArray !== undefined) {
			infoArray.forEach(function (info: any) {
				rooms.push(new Room(info["fullname"], info["shortname"], info["number"]
					, info["shortname"] + "_" + info["number"]
					, info["address"], Number(info["lat"]), Number(info["lon"]), Number(info["seats"]), info["type"]
					, info["furniture"], info["href"]));
			});
		}
	}
}