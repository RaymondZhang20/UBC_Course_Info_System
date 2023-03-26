import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";
import {assert, expect, use} from "chai";
import request, {Response} from "supertest";
import {InsightDataset, InsightError} from "../../src/controller/IInsightFacade";
import * as fs from "fs";
import {getContentFromArchives} from "../TestUtil";

describe("Server", () => {
	let facade: InsightFacade;
	let server: Server;
	let sections1: any;
	let rooms1: any;

	before(async () => {
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
		it("PUT test for courses dataset",
			async () => {
				try {
					this.timeout(10000);
					return request("http://localhost:4321")
						.put("/dataset/sect/sections")
						.send(sections1)
						.set("Content-Type", "application/x-zip-compressed")
						.then((res: Response) => {
							console.info(res.error);
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
	});
	// The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
