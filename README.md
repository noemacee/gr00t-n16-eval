# GR00T N1.6 — Zero-Shot vs Fine-Tuned Comparison

**Project page:** https://noemacee.github.io/gr00t-n16-eval/

Evaluate `nvidia/GR00T-N1.6-3B` (zero-shot) against `nvidia/GR00T-N1.6-fractal`
(fine-tuned on Google Robot Fractal dataset) on tabletop manipulation tasks in
SimplerEnv. Record rollout videos and success rates per task per model.

---

## Hardware

| | |
|---|---|
| Instance | AWS g5.2xlarge |
| GPU | NVIDIA A10G — 24 GB VRAM |
| RAM | 32 GB |
| Storage | 100 GB SSD (expand to 150 GB before setup) |
| OS | Ubuntu 22.04 (Deep Learning AMI) |

---

## Stack

| Component | Detail |
|-----------|--------|
| Simulation | SimplerEnv (MuJoCo-based, headless via EGL) |
| Robot | Google Robot (`OXE_GOOGLE` embodiment) |
| Base model | `nvidia/GR00T-N1.6-3B` (3B params, zero-shot) |
| Fine-tuned model | `nvidia/GR00T-N1.6-fractal` |
| Inference | GR00T Policy Server — server/client on port 5555 |

---

## Tasks

Four tasks selected to cover easy / medium / hard:

| Task (`--env_name`) | Fine-tuned reference |
|---------------------|----------------------|
| `simpler_env_google/google_robot_pick_coke_can` | 97.5% |
| `simpler_env_google/google_robot_close_drawer` | 87.5% |
| `simpler_env_google/google_robot_open_drawer` | 44.0% |
| `simpler_env_google/google_robot_move_near` | 75.5% |

Zero-shot baseline numbers are not published — your runs produce them.

---

## Setup

Run once on a fresh instance from the home directory.

```bash
# 1. Expand EBS to 150 GB in AWS console before this step

# 2. System packages
sudo apt-get update -qq
sudo apt-get install -y git curl wget tmux ffmpeg \
    libegl1-mesa-dev libglu1-mesa libgl1-mesa-glx libosmesa6-dev

# 3. Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# 4. Clone Isaac-GR00T
git clone --recurse-submodules https://github.com/NVIDIA/Isaac-GR00T ~/Isaac-GR00T
cd ~/Isaac-GR00T

# 5. Install Python dependencies
bash scripts/deployment/dgpu/install_deps.sh
source .venv/bin/activate

# 6. Install SimplerEnv sim layer (run once)
bash gr00t/eval/sim/SimplerEnv/setup_SimplerEnv.sh

# 7. Download model weights
huggingface-cli download nvidia/GR00T-N1.6-3B
huggingface-cli download nvidia/GR00T-N1.6-fractal

# 8. Verify GPU
nvidia-smi
uv run python -c "import torch; print(torch.cuda.get_device_name(0))"
```

---

## Running the Comparison

Each model needs two terminals. Repeat for base and fine-tuned.
Run from `~/Isaac-GR00T`.

```bash
export MUJOCO_GL=egl
export PYOPENGL_PLATFORM=egl
```

### Terminal 1 — Policy server

**Base (zero-shot):**
```bash
uv run python gr00t/eval/run_gr00t_server.py \
    --model-path nvidia/GR00T-N1.6-3B \
    --embodiment-tag OXE_GOOGLE \
    --use-sim-policy-wrapper \
    --port 5555
```

**Fine-tuned:**
```bash
uv run python gr00t/eval/run_gr00t_server.py \
    --model-path nvidia/GR00T-N1.6-fractal \
    --embodiment-tag OXE_GOOGLE \
    --use-sim-policy-wrapper \
    --port 5555
```

### Terminal 2 — Rollout client

Replace `<TASK>` with each env name from the tasks table above.

```bash
gr00t/eval/sim/SimplerEnv/simpler_uv/.venv/bin/python \
    gr00t/eval/rollout_policy.py \
    --policy_client_host 127.0.0.1 \
    --policy_client_port 5555 \
    --env_name <TASK> \
    --n_episodes 20 \
    --n_action_steps 1 \
    --n_envs 5 \
    --max_episode_steps 300
```

Run all 4 tasks for both models (8 runs total).

