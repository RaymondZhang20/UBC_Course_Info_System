import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";
import {assert, expect, use} from "chai";
import request, {Response} from "supertest";
import {InsightDataset, InsightDatasetKind, InsightError} from "../../src/controller/IInsightFacade";
import * as fs from "fs";
import {clearDisk, getContentFromArchives} from "../TestUtil";

describe("Server", () => {
	let facade: InsightFacade;
	let server: Server;
	let sections1: any;
	let rooms1: any;

	before(async () => {
		clearDisk();
		facade = new InsightFacade();
		server = new Server(4321);
		sections1 = Buffer.from(getContentFromArchives("pair.zip"), "base64");
		rooms1 = Buffer.from(getContentFromArchives("campus.zip"), "base64");
		// TODO: start server here once and handle errors properly
		return await server.start();
	});

	after(() => {
		// TODO: stop server here once!
		server.stop();
	});

	beforeEach(() => {
		// might want to add some process logging here to keep track of what's going on
	});

	afterEach(() => {
		// might want to add some process logging here to keep track of what's going on
	});

	// Sample on how to format PUT requests
	/*
	it("PUT test for courses dataset", async () => {
		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed")
				.then((res: Response) => {
					expect(res.status).to.be.equal(200);
					// more assertions here
				})
				.catch((err) => {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});
	 */
	describe("InsightFacade", function () {
		after(async function (){
			await clearDisk();
		});
		it("PUT test for courses dataset",
			async () => {
				try {
					this.timeout(10000);
					return request("http://localhost:4321")
						.put("/dataset/sections1/sections")
						.send(sections1)
						.set("Content-Type", "application/x-zip-compressed")
						.then((res: Response) => {
							expect(res.status).to.be.equal(200);
							// more assertions here
						})
						.catch((err) => {
							console.info(err);
							// some logging here please!
							expect.fail();
						});
				} catch (err) {
					console.info(err);
					// and some more logging here!
				}
			});

		it("PUT for rooms", async function () {
			this.timeout(10000);
			try {
				return request("http://localhost:4321")
					.put("/dataset/rooms1/rooms")
					.send(rooms1)
					.set("Content-Type", "application/x-zip-compressed")
					.then((res: Response) => {
						console.log(res.body);
						expect(res.status).to.be.equal(200);
					})
					.catch(function (err) {
						console.log(err);
						expect.fail();
					});
			} catch (err) {
				console.log(err);
			}
		});

		it( "PUT test but underscore for courses dataset",
			async () => {
				try {
					this.timeout(10000);
					return request("http://localhost:4321")
						.put("/dataset/s_ect/sections")
						.send(sections1)
						.set("Content-Type", "application/x-zip-compressed")
						.then((res: Response) => {
							console.info(res.error);
							expect(res.status).to.be.equal(400);
							// more assertions here
						})
						.catch((err) => {
							console.info(err);
							// some logging here please!
							expect.fail();
						});
				} catch (err) {
					console.info(err);
					// and some more logging here!
				}
			});

		it( "PUT test but empty for courses dataset",
			async () => {
				try {
					this.timeout(10000);
					return request("http://localhost:4321")
						.put("/dataset/ /sections")
						.send(sections1)
						.set("Content-Type", "application/x-zip-compressed")
						.then((res: Response) => {
							console.info(res.error);
							expect(res.status).to.be.equal(400);
							// more assertions here
						})
						.catch((err) => {
							console.info(err);
							// some logging here please!
							expect.fail();
						});
				} catch (err) {
					console.info(err);
					// and some more logging here!
				}
			});

		it( "PUT test but repeated for courses dataset",
			async () => {
				try {
					this.timeout(10000);
					return request("http://localhost:4321")
						.put("/dataset/sections1/sections")
						.send(sections1)
						.set("Content-Type", "application/x-zip-compressed")
						.then((res: Response) => {
							console.info(res.error);
							expect(res.status).to.be.equal(400);
							// more assertions here
						})
						.catch((err) => {
							console.info(err);
							// some logging here please!
							expect.fail();
						});
				} catch (err) {
					console.info(err);
					// and some more logging here!
				}
			});
		it("GET", async function () {
			this.timeout(10000);
			try {
				return request("http://localhost:4321")
					.get("/datasets")
					.set("Content-Type", "application/x-zip-compressed")
					.then((res: Response) => {
						console.log(res.body);
						expect(res.status).to.be.equal(200);
					})
					.catch(function (err) {
						console.log(err);
						expect.fail();
					});
			} catch (err) {
				console.log(err);
			}
		});
		it("DELETE for sections", async function () {
			this.timeout(10000);
			try {
				return request("http://localhost:4321")
					.delete("/dataset/sections1")
					.set("Content-Type", "application/x-zip-compressed")
					.then((res: Response) => {
						console.log(res.body);
						expect(res.status).to.be.equal(200);
					})
					.catch(function (err) {
						console.log(err);
						expect.fail();
					});
			} catch (err) {
				console.log(err);
			}
		});
		it("DELETE not found", async function () {
			this.timeout(10000);
			try {
				return request("http://localhost:4321")
					.delete("/dataset/111")
					.set("Content-Type", "application/x-zip-compressed")
					.then((res: Response) => {
						console.log(res.error);
						expect(res.status).to.be.equal(404);
					})
					.catch(function (err) {
						console.log(err);
						expect.fail();
					});
			} catch (err) {
				console.log(err);
			}
		});
		it("DELETE invalid", async function () {
			this.timeout(10000);
			try {
				return request("http://localhost:4321")
					.delete("/dataset/sm_th")
					.set("Content-Type", "application/x-zip-compressed")
					.then((res: Response) => {
						console.log(res.error);
						expect(res.status).to.be.equal(400);
					})
					.catch(function (err) {
						console.log(err);
						expect.fail();
					});
			} catch (err) {
				console.log(err);
			}
		});
		it("DELETE for rooms", async function () {
			this.timeout(10000);
			try {
				return request("http://localhost:4321")
					.delete("/dataset/rooms1")
					.set("Content-Type", "application/x-zip-compressed")
					.then((res: Response) => {
						console.log(res.body);
						expect(res.status).to.be.equal(200);
					})
					.catch(function (err) {
						console.log(err);
						expect.fail();
					});
			} catch (err) {
				console.log(err);
			}
		});
		it("GET", async function () {
			this.timeout(10000);
			try {
				return request("http://localhost:4321")
					.get("/datasets")
					.set("Content-Type", "application/x-zip-compressed")
					.then((res: Response) => {
						console.log(res.body);
						expect(res.status).to.be.equal(200);
					})
					.catch(function (err) {
						console.log(err);
						expect.fail();
					});
			} catch (err) {
				console.log(err);
			}
		});
	});
	// The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
