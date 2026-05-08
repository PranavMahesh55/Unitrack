async function main() {
  console.log("No seed data is required for the train-ingestion-only scope.");
}

main()
  .then(() => undefined)
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  });
