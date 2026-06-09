# Aruba GPTHAR_H Multi-task Run

This project currently does not include the Aruba GPT pretrained embedding files referenced by:

```text
pretrain_embedding/GPT2_8H_3L_384E/aruba/run_2023_07_18_13_34_35_Dataset_aruba_Encoding_basic_raw_WindowsSize_1024_EmbeddingSize_384_BatchSize_8_NbEpochs_1000_Head8_Layers_3_Stride_512/
```

The missing files are:

```text
GPT_basic_raw_aruba_1024_384_model.h5
GPT_basic_raw_aruba_1024_384_dict_vocabulary.json
experiment_parameters.json
```

## 1. Prepare Aruba Time Pickles

`GPTEmbeddingExperimentations.py` loads:

```text
datasets/aruba_train_data_time.pickle
```

If this file does not exist, open and run:

```text
data_preprocessing_time.ipynb
```

Make sure the dataset cell is set to:

```python
dataset = Aruba()
```

Expected outputs:

```text
datasets/aruba_train_data_time.pickle
datasets/aruba_test_data_time.pickle
```

## 2. Generate Aruba GPT Pretrained Embedding

From `alg/Code`, run:

```bash
python GPTEmbeddingExperimentations.py --d aruba --e gpt2 --c configs/embeddings/GPT2_8H_3L_384E.json
```

The command arguments match the current script:

```text
--d aruba
--e gpt2
--c configs/embeddings/GPT2_8H_3L_384E.json
```

Runtime requirements:

```bash
pip install -r ../requirements.txt
```

The script imports TensorFlow, so `tensorflow==2.12.0` must be installed in the active environment.

## 3. Update Aruba GPTHAR_H Config

After pretraining finishes, find the generated folder under:

```text
pretrain_embedding/GPT2_8H_3L_384E/aruba/
```

Then update:

```text
configs/GPTHAR_H/aruba_bi_lstm_gpt2_8H_3L_384E_hierarcy_hour.json
```

Set these keys to the generated files:

```json
"pre_train_embedding": "pretrain_embedding/GPT2_8H_3L_384E/aruba/<generated_run_folder>/GPT_basic_raw_aruba_1024_384_model.h5",
"word_dict": "pretrain_embedding/GPT2_8H_3L_384E/aruba/<generated_run_folder>/GPT_basic_raw_aruba_1024_384_dict_vocabulary.json",
"embedding_parameters": "pretrain_embedding/GPT2_8H_3L_384E/aruba/<generated_run_folder>/experiment_parameters.json"
```

Keep multi-task settings enabled:

```json
"multi_task_learning": true,
"time_slot_loss_alpha": 0.5
```

## 4. Prepare Classification Data

Run:

```text
classification_data_preprocessing_time.ipynb
```

Expected outputs:

```text
datasets/aruba_train_classification_data_time_dataframe.pickle
datasets/aruba_test_classification_data_time_dataframe.pickle
```

## 4-1. Why the Classification Dataset Is Smaller

The classification dataset is smaller than the raw CASAS sensor log because the
preprocessing does not use every sensor event as one training sample.

In `data_preprocessing_time.ipynb`, the raw log is first split into weekly
dataframes and saved as:

```text
datasets/<dataset>_train_data_time.pickle
datasets/<dataset>_test_data_time.pickle
```

Then `classification_data_preprocessing_time.ipynb` converts the weekly logs into
activity-level sequences. The function `split_dataset_into_segments()` creates a
new sequence only when the `activity` value changes, and it discards segments
whose length is 1:

```python
transitionIndex = df.activity.ne(df.activity.shift())
if len(df[start:end]) > 1:
    chunks.append(df[start:end])
```

After that, `generate_dict_dataset_for_multi_seg_inputs()` builds one model input
from three consecutive activity sequences. Therefore, the model input is not a
single raw sensor row, but a sequence group such as:

```text
M005OFF -> M007ON -> M004ON
```

Because three consecutive activity segments are required, the loop condition is:

```python
while stride < len(activity_sequences_X) - 2:
```

This means the final two activity sequences in each processed split cannot form a
complete 3-sequence input window and are not converted into classification
samples. As a result, the final training/evaluation data size is determined by
the number of valid activity segments, not by the number of raw CASAS sensor
events.

For the appliance recommendation dataset, `build_service_activity_datasets.py`
applies an additional start-event filter:

```python
activityState == "begin"
```

This keeps only the activity start point and removes ordinary intermediate sensor
events. Therefore, the start-time/recommendation CSVs are also much smaller than
the original sensor log.

In the current Aruba run, the final classification dataframe contains:

```text
train: 8,875 samples
test:  3,720 samples
total: 12,595 samples
```

The same preprocessing rule is applied to Cairo and Milan. Thus, the reported
final counts correspond to valid activity-sequence samples after segmentation and
3-sequence windowing:

```text
Aruba: 12,595 samples
Milan: 4,536 samples
Cairo: 1,196 samples
```

## 5. Run Aruba GPTHAR_H Classification

From `alg/Code`, run:

```bash
python classification_train.py --d aruba --e GPTHAR_H --c configs/GPTHAR_H/aruba_bi_lstm_gpt2_8H_3L_384E_hierarcy_hour.json --n 1 --cv False
```

`classification_train.py` now accepts both `--n` and `--nb` for the run count.

Before training starts, the script prints:

```text
pre_train_embedding
word_dict
embedding_parameters
time_slot_loss_alpha
```

If any pretrained file is missing, it raises `FileNotFoundError` and lists the missing config key and path.
