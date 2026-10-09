// Only resources created by this startup are released. Preserve its original error.
export async function startupResources(createFixture,createProxy){
 const fixture=await createFixture();
 try{return {fixture,proxy:await createProxy({fixtureOrigin:fixture.origin})};}
 catch(error){try{await fixture.close();}catch(cleanup){error.resourceCleanupCode=typeof cleanup.code==='string'?cleanup.code:'FIXTURE_CLOSE_UNKNOWN';}throw error;}
}
