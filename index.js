const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");
/**
 {
  "creator": 10527647,
  "id": 116370396,
  "image_id": null,
  "images": [
    {
      "architecture": "amd64",
      "features": "",
      "variant": null,
      "digest": "sha256:a6b6e3b02efb5e0ba3be56c58affe087fcb19b98061bce23858dc247471c18ad",
      "os": "linux",
      "os_features": "",
      "os_version": null,
      "size": 161073072
    }
  ],
  "last_updated": "2020-09-07T16:22:57.28556Z",
  "last_updater": 10527647,
  "last_updater_username": "m3ntorshipci",
  "name": "9976",
  "repository": 9641846,
  "full_size": 161073072,
  "v2": true
}
 * 
 */
const dockerhubAPI = axios.create({
  baseURL: "https://hub.docker.com/v2",
  headers: {
    Authorization: `JWT ${process.env.DOCKER_HUB_TOKEN}`,
  },
});

const getAllCurrentTags = (user, repo) => {
  return dockerhubAPI({
    url: `/repositories/${user}/${repo}/tags/`,
    params: {
      page_size: 5000,
    },
  });
};

const deleteSingleTag = (user, repo, tag) => {
  return dockerhubAPI({
    method: "DELETE",
    url: `/repositories/${user}/${repo}/tags/${tag}/`,
  });
};

const getOldTags = (numbersToKeep, tags) => {
  // we are strongly assume that dockerhub api returns
  // the tags sorted by last_updated date (newest first)
  return tags
    .filter((tag, i) => {
      if (i > numbersToKeep - 1) {
        return true;
      }
    })
    .map(({ name }) => name);
};

const run = async () => {
  try {
    // inputs
    const numberOfTagsToKeep = core.getInput("keep-last");
    const dockerhubUser = core.getInput("user");
    const dockerhubRepo = core.getInput("repo");

    console.log(`keep-last ${numberOfTagsToKeep}`);
    console.log(`user ${dockerhubUser}`);
    console.log(`repo ${dockerhubRepo}`);

    // get all current tags
    const {
      data: { results },
    } = await getAllCurrentTags(dockerhubUser, dockerhubRepo);

    // get old tags
    const oldTags = getOldTags(numberOfTagsToKeep, results);

    // create tag deletion promises
    const tagDeletionPromises = oldTags.map((tag) => {
      return deleteSingleTag(dockerhubUser, dockerhubRepo, tag);
    });

    // wait for all tag deletion promises to resolve
    await Promise.all(tagDeletionPromises);

    core.setOutput("success", true);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();