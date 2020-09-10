const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");

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
  console.log(`🟡 deleting ${tag} tag from ${user}/${repo}`)
  return dockerhubAPI({
    method: "DELETE",
    url: `/repositories/${user}/${repo}/tags/${tag}/`,
  }).then((response) => {
    console.log(`✅ successfully deleted ${tag} from ${user}/${repo}`)
    return response
  })
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
    console.log(`about to delete ${oldTags.length} which are ${JSON.stringify(oldTags)}`);
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