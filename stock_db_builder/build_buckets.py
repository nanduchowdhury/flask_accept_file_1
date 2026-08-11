from builders.bucket_builder import BucketBuilder


def main():

    builder = BucketBuilder()

    builder.build(
        master_json_path="output/stocks_master.json",
        output_path="output/stocks_buckets.json"
    )


if __name__ == "__main__":
    main()
    