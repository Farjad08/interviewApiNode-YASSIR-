import { FastifyRequest, FastifyReply } from "fastify";
import { PokemonWithStats } from "models/PokemonWithStats";

// Used axios to simplify the code and make multiple requests in parallel.
import axios from "axios"

/**
 * Returns pokemon list if name not provided
 * Returns pokemon details if name provided
 * @param {FastifyRequest} request
 * @param {FastifyReply} reply 
 * @return
 */
export async function getPokemonByName(request: FastifyRequest, reply: FastifyReply) {
  var name: string = request?.params["name"];
  reply.header("Content-Type", "application/json");

  const urlApiPokeman = `https://pokeapi.co/api/v2/pokemon/${name ? name : '?offset=20&limit=20'}`;

  try {
    const response: any = await axios.get(urlApiPokeman);

    if (!response) {
      reply.code(404).send();
      return reply;
    }

    const responseData: any = response.data;

    // If name is provided in params then only computeResponse is called. 
    if (name) {
      await computeResponse(responseData);
    }

    reply.code(200).send(responseData);
  } catch (err) {
    console.error(err);
    reply.code(500).send({ error: "Internal Server Error" });
  }
}

/**
 * Set average stats(averageStat) of a pokemon in response.stats
 * @param response 
 */
export const computeResponse = async (response: unknown) => {
  try {
    const resp = response as any

    // Get all type URLs
    const typesUrls = resp.types.map(type => type.type.url);
  
    // Send promise.all request to executes all promises in parallel
    const typesResponses = await Promise.all(
      typesUrls.map(url => axios.get(url))
    );
  
    // Take out data from typesResponses
    const types = typesResponses.map(response => response.data);
  
    resp.stats.forEach(stat => {
      const filteredStats = types
        .map(type => type.stats.find(typeStat => typeStat.stat.name.toUpperCase() === stat.stat.name.toUpperCase()))
        .filter(Boolean);
  
      stat.averageStat = filteredStats.length > 0 ? filteredStats.reduce((a, b) => a + b.base_stat, 0) / filteredStats.length : 0;
    });
  } catch (err) {
    throw new Error(err)
  }
}